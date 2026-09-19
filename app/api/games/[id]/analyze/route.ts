import { NextResponse } from "next/server";

import { saveAnalysisSchema } from "@/lib/analysis/save-schema";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { createClient } from "@/lib/supabase/server";

// A stored row: the analysis fields plus the timestamp the database stamps.
// Used to type the reads so ply arithmetic and the response are not built on any.
type AnalysisRow = MoveAnalysis & { created_at: string };

// Postgres rejects a malformed uuid with an error rather than an empty result,
// so an id that cannot be one is answered here instead of being sent down. Same
// guard as the game page and the delete route.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PostgREST's code for "this table is not in the schema cache", which is what an
// unapplied migration looks like from here. See app/api/games/save/route.ts.
const TABLE_MISSING = "PGRST205";

// The columns returned to the client, in the order the schema defines them.
// created_at rides along so the UI can show when the analysis was run.
const ANALYSIS_COLUMNS =
  "ply, move_uci, engine_best_uci, eval_before, eval_after, eval_loss, classification, is_user_move, created_at";

type OwnedGame = { user: { id: string } } | { response: NextResponse };

// Everything both handlers do before they diverge: require a session, reject a
// non-uuid id, and confirm the game exists and belongs to the caller. RLS on
// move_analyses already keys off the game's owner, so this is belt-and-braces,
// but it also turns "someone else's game" and "no such game" into the same 404
// rather than a silent empty result.
async function requireOwnedGame(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<OwnedGame> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return { response: NextResponse.json({ error: "not_authenticated" }, { status: 401 }) };
  }

  if (!UUID.test(id)) {
    return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }

  const game = await supabase
    .from("games")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (game.error !== null) {
    console.error("[games/analyze] game lookup failed", game.error);
    return { response: NextResponse.json({ error: "lookup_failed" }, { status: 500 }) };
  }
  if (game.data === null) {
    return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }

  return { user };
}

// Loads any stored analysis so the replay screen can show cached results
// without recomputing. An empty array is a normal answer: the game has not
// been analysed yet.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const owned = await requireOwnedGame(supabase, id);
  if ("response" in owned) return owned.response;

  const { data, error } = await supabase
    .from("move_analyses")
    .select(ANALYSIS_COLUMNS)
    .eq("game_id", id)
    .order("ply")
    .returns<AnalysisRow[]>();

  if (error !== null) {
    if (error.code === TABLE_MISSING) {
      console.error(
        "[games/analyze] move_analyses table not found. Apply supabase/migrations/20260918120000_move_analyses.sql.",
        error,
      );
      return NextResponse.json({ error: "analyses_table_missing" }, { status: 500 });
    }
    console.error("[games/analyze] read failed", error);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  return NextResponse.json({ moves: data ?? [] }, { status: 200 });
}

// Stores a freshly computed analysis. The client did the engine work; this
// validates the shape and writes it. If the game already has an analysis, that
// one is returned untouched rather than a second one being inserted: analysis
// is deterministic for a fixed game and depth, so recomputing gains nothing and
// the unique (game_id, ply) constraint would reject it anyway.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const owned = await requireOwnedGame(supabase, id);
  if ("response" in owned) return owned.response;

  // Already analysed? Return what is stored and do not touch it.
  const existing = await supabase
    .from("move_analyses")
    .select(ANALYSIS_COLUMNS)
    .eq("game_id", id)
    .order("ply")
    .returns<AnalysisRow[]>();

  if (existing.error !== null) {
    if (existing.error.code === TABLE_MISSING) {
      console.error(
        "[games/analyze] move_analyses table not found. Apply supabase/migrations/20260918120000_move_analyses.sql.",
        existing.error,
      );
      return NextResponse.json({ error: "analyses_table_missing" }, { status: 500 });
    }
    console.error("[games/analyze] existing read failed", existing.error);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  if (existing.data !== null && existing.data.length > 0) {
    return NextResponse.json({ moves: existing.data, cached: true }, { status: 200 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_analysis_data" }, { status: 400 });
  }

  const parsed = saveAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    // Which field failed stays server-side: the client wrote this payload.
    console.error("[games/analyze] rejected payload", parsed.error.issues);
    return NextResponse.json({ error: "invalid_analysis_data" }, { status: 400 });
  }

  // game_id comes from the route, never the body. The insert policy checks it
  // against the game's owner as well, so a row for someone else's game is
  // rejected by the database rather than trusted here.
  const rows = parsed.data.moves.map((move) => ({ ...move, game_id: id }));

  const { data, error } = await supabase
    .from("move_analyses")
    .insert(rows)
    .select(ANALYSIS_COLUMNS)
    .returns<AnalysisRow[]>();

  if (error !== null || data === null) {
    console.error("[games/analyze] insert failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Insertion order is not guaranteed, and the UI reads the list top to bottom
  // by ply, so it is ordered here rather than trusting the returned order.
  const moves = [...data].sort((a, b) => a.ply - b.ply);
  return NextResponse.json({ moves, cached: false }, { status: 201 });
}
