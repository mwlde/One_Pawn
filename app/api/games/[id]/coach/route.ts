import { Chess } from "chess.js";
import { NextResponse } from "next/server";

import type { MoveAnalysis } from "@/lib/analysis/types";
import { callGroq, GroqError } from "@/lib/coach/groq";
import { buildMoveCommentaryPrompt, buildSummaryPrompt } from "@/lib/coach/prompts";
import { selectNotableMoves } from "@/lib/coach/select-notable-moves";
import type { GameCommentary, MoveCommentary, StoredMoveCommentary } from "@/lib/coach/types";
import { parseEngineMove } from "@/lib/game/engine-move";
import { describeDifficulty } from "@/lib/game/history";
import type { Side } from "@/lib/game/settings";
import { createClient } from "@/lib/supabase/server";

// Same uuid guard as the analyze route: a malformed id is a 404 here rather than
// a Postgres error about invalid input syntax.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PostgREST's "table not in the schema cache" code: what an unapplied migration
// looks like from here. See the analyze route.
const TABLE_MISSING = "PGRST205";

const ANALYSIS_COLUMNS =
  "ply, move_uci, engine_best_uci, eval_before, eval_after, eval_loss, classification, is_user_move";

const MOVE_COMMENTARY_COLUMNS = "ply, commentary, reason, generated_at";

type GameRow = {
  pgn: string;
  user_color: Side;
  difficulty: number;
  mode: string;
};

type OwnedGame = { game: GameRow } | { response: NextResponse };

// Auth, uuid check, ownership and the game row in one pass, as the analyze route
// does. Returns the columns the commentary needs: the PGN to rebuild positions,
// the colour whose moves are the student's, the depth for the summary's context,
// and the mode so a Play game is refused.
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
    .select("pgn, user_color, difficulty, mode")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<GameRow>();

  if (game.error !== null) {
    console.error("[games/coach] game lookup failed", game.error);
    return { response: NextResponse.json({ error: "lookup_failed" }, { status: 500 }) };
  }
  if (game.data === null) {
    return { response: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }

  return { game: game.data };
}

// Reads whatever commentary is stored for a game: the summary (or null when
// there is no row yet) and the per-move notes in ply order. Shared by the GET
// handler, the POST cache hit, and the response after a fresh write, so all
// three return the same shape. A missing commentary table is surfaced as null so
// a coach view can still show the classifications it already has.
async function readStoredCommentary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameId: string,
): Promise<GameCommentary | { tableMissing: true } | { readFailed: true }> {
  const summary = await supabase
    .from("game_commentary")
    .select("summary")
    .eq("game_id", gameId)
    .maybeSingle<{ summary: string | null }>();

  if (summary.error !== null) {
    if (summary.error.code === TABLE_MISSING) return { tableMissing: true };
    console.error("[games/coach] summary read failed", summary.error);
    return { readFailed: true };
  }

  const moves = await supabase
    .from("move_commentary")
    .select(MOVE_COMMENTARY_COLUMNS)
    .eq("game_id", gameId)
    .order("ply")
    .returns<StoredMoveCommentary[]>();

  if (moves.error !== null) {
    if (moves.error.code === TABLE_MISSING) return { tableMissing: true };
    console.error("[games/coach] move commentary read failed", moves.error);
    return { readFailed: true };
  }

  return {
    summary: summary.data?.summary ?? null,
    moves: moves.data ?? [],
  };
}

// The SAN of a move played from a position, so prompts read moves the way a
// player does. Returns the raw UCI as a last resort rather than throwing while a
// prompt is being built.
function toSan(fenBefore: string, uci: string): string {
  const parsed = parseEngineMove(uci);
  if (parsed === null) return uci;
  const chess = new Chess(fenBefore);
  try {
    return chess.move(parsed).san;
  } catch {
    return uci;
  }
}

// GET returns any stored commentary without generating anything. An empty result
// (summary null, no moves) is a normal answer: the game has not been commentated
// yet. The coach view uses this to load a game opened from the profile.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const owned = await requireOwnedGame(supabase, id);
  if ("response" in owned) return owned.response;

  const stored = await readStoredCommentary(supabase, id);
  if ("tableMissing" in stored) {
    console.error(
      "[games/coach] commentary tables not found. Apply supabase/migrations/20260919120000_game_commentary.sql.",
    );
    return NextResponse.json({ error: "commentary_tables_missing" }, { status: 500 });
  }
  if ("readFailed" in stored) {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  return NextResponse.json({ ...stored, cached: true }, { status: 200 });
}

// POST generates commentary for a Coach-mode game, or returns the cached
// commentary if it already exists. The analysis must already be saved (the play
// screen and the profile both save it before calling this): the evals the
// prompts lean on are read from move_analyses, not taken from the request body,
// so no client-supplied number ever reaches an LLM prompt. The request body is
// ignored on purpose.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const owned = await requireOwnedGame(supabase, id);
  if ("response" in owned) return owned.response;
  const { game } = owned;

  // Commentary is a Coach-mode feature. Refusing here bounds every LLM call to a
  // game the student chose to have coached, so a Play game can never run up a
  // Groq bill from a stray request.
  if (game.mode !== "coach") {
    return NextResponse.json({ error: "not_coach_mode" }, { status: 400 });
  }

  // Cache: if a summary row exists the game has already been commentated. Return
  // what is stored and spend nothing.
  const existing = await readStoredCommentary(supabase, id);
  if ("tableMissing" in existing) {
    console.error(
      "[games/coach] commentary tables not found. Apply supabase/migrations/20260919120000_game_commentary.sql.",
    );
    return NextResponse.json({ error: "commentary_tables_missing" }, { status: 500 });
  }
  if ("readFailed" in existing) {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  if (existing.summary !== null) {
    return NextResponse.json({ ...existing, cached: true }, { status: 200 });
  }

  // The analysis is the source of truth for every eval the prompts use.
  const analysis = await supabase
    .from("move_analyses")
    .select(ANALYSIS_COLUMNS)
    .eq("game_id", id)
    .order("ply")
    .returns<MoveAnalysis[]>();

  if (analysis.error !== null) {
    console.error("[games/coach] analysis read failed", analysis.error);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  const analyses = analysis.data ?? [];
  if (analyses.length === 0) {
    // No analysis means nothing to explain. The caller is meant to save the
    // analysis first; this is a mistake in the flow, not a normal state.
    return NextResponse.json({ error: "not_analyzed" }, { status: 400 });
  }

  // Rebuild each position from the PGN so the prompts can name moves in SAN and
  // know whose turn it was. Built once here rather than per move.
  const chess = new Chess();
  try {
    chess.loadPgn(game.pgn);
  } catch {
    console.error("[games/coach] pgn could not be read", id);
    return NextResponse.json({ error: "unreadable_game" }, { status: 500 });
  }
  const history = chess.history({ verbose: true });

  const notable = selectNotableMoves(analyses);
  const difficulty = describeDifficulty(game.difficulty);

  // The summary is the anchor. If it cannot be generated, write nothing and
  // report failure, so the whole game stays retriable rather than half-saved.
  // Per-move failures below are tolerated instead: a missing note is degraded,
  // a missing summary is not worth committing.
  let summary: string;
  try {
    const summaryPrompt = buildSummaryPrompt({
      pgn: game.pgn,
      userColor: game.user_color,
      difficulty,
      moves: analyses.map((move) => ({
        ply: move.ply,
        san: history[move.ply - 1]?.san ?? move.move_uci,
        classification: move.classification,
      })),
    });
    summary = await callGroq(summaryPrompt.system, summaryPrompt.user);
  } catch (cause) {
    logGroqFailure("summary", cause);
    return NextResponse.json({ summary: null, moves: [], failed: true }, { status: 200 });
  }

  // Per-move commentary, one Groq call each, in sequence. Sequential rather than
  // parallel to stay under a free-tier rate limit: a bad game can have many
  // notable moves, and a burst of parallel calls is the quickest way to a 429.
  const generated: MoveCommentary[] = [];
  let anyMoveFailed = false;
  for (const move of notable) {
    const fenBefore = history[move.ply - 1]?.before ?? "";
    const prompt = buildMoveCommentaryPrompt({
      ply: move.ply,
      userColor: game.user_color,
      fenBefore,
      playedMove: history[move.ply - 1]?.san ?? move.analysis.move_uci,
      engineBestMove: toSan(fenBefore, move.analysis.engine_best_uci),
      classification: move.analysis.classification,
      evalLossCp: move.analysis.eval_loss,
      reason: move.reason,
    });
    try {
      const text = await callGroq(prompt.system, prompt.user, { maxTokens: 300 });
      generated.push({ ply: move.ply, commentary: text, reason: move.reason });
    } catch (cause) {
      // A single note failing is degraded, not fatal: the summary and the other
      // notes still ship, and the missing one simply is not shown.
      logGroqFailure(`move ${move.ply} (${move.reason})`, cause);
      anyMoveFailed = true;
    }
  }

  // Write the per-move notes first, then the summary row. The summary row is the
  // cache marker (its presence is what the cache check reads), so writing it last
  // means a crash mid-write leaves no marker and the game regenerates cleanly.
  // The move insert ignores duplicates so that regeneration cannot collide with
  // notes a previous attempt already wrote.
  if (generated.length > 0) {
    const rows = generated.map((row) => ({ ...row, game_id: id }));
    const moveInsert = await supabase
      .from("move_commentary")
      .upsert(rows, { onConflict: "game_id,ply,reason", ignoreDuplicates: true });
    if (moveInsert.error !== null) {
      console.error("[games/coach] move commentary insert failed", moveInsert.error);
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  }

  // ignoreDuplicates makes this ON CONFLICT DO NOTHING, an insert. A plain
  // upsert would be ON CONFLICT DO UPDATE, which Postgres requires the UPDATE
  // privilege for, and this table is granted only select/insert/delete on
  // purpose (see the migration). We only reach here on a cache miss, so there is
  // no row to update anyway; DO NOTHING also makes a concurrent double-POST safe.
  const summaryInsert = await supabase
    .from("game_commentary")
    .upsert({ game_id: id, summary }, { onConflict: "game_id", ignoreDuplicates: true });
  if (summaryInsert.error !== null) {
    console.error("[games/coach] summary insert failed", summaryInsert.error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Re-read so the response carries the database timestamps and the exact stored
  // order, the same shape a cache hit returns.
  const stored = await readStoredCommentary(supabase, id);
  if ("tableMissing" in stored || "readFailed" in stored) {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  return NextResponse.json({ ...stored, cached: false, partial: anyMoveFailed }, { status: 201 });
}

// One place to log a Groq failure with its type, so the server logs show whether
// rate limits are being hit (4B.9). The type name is enough to tell a 429 from a
// 5xx from a timeout without dumping the whole error.
function logGroqFailure(where: string, cause: unknown): void {
  if (cause instanceof GroqError) {
    console.error(`[games/coach] Groq ${cause.name} while generating ${where}: ${cause.message}`);
  } else {
    console.error(`[games/coach] unexpected failure while generating ${where}`, cause);
  }
}
