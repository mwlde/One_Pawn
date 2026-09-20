// Reading a game's stored commentary from a Server Component, alongside
// lib/analysis/server.ts. The replay screen needs both before it renders: the
// presence of commentary is what decides between the coach view and the plain
// replay, and deciding that on the client would mean painting one layout and
// then swapping it for the other.
//
// The route at /api/games/[id]/coach still owns generation and its own reads.
// This is the read half only, and it never throws: a game with no commentary
// and a commentary table that could not be read both come back empty, which is
// exactly what the coach panel's generate path already handles.

import type { createClient } from "@/lib/supabase/server";

import type { GameCommentary, StoredMoveCommentary } from "./types";

const MOVE_COMMENTARY_COLUMNS = "ply, commentary, reason, generated_at";

const EMPTY: GameCommentary = { summary: null, moves: [] };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function readStoredCommentary(
  supabase: ServerClient,
  gameId: string,
): Promise<GameCommentary> {
  const summary = await supabase
    .from("game_commentary")
    .select("summary")
    .eq("game_id", gameId)
    .maybeSingle<{ summary: string | null }>();

  if (summary.error !== null) {
    console.error("[profile/game] summary read failed", summary.error);
    return EMPTY;
  }

  const moves = await supabase
    .from("move_commentary")
    .select(MOVE_COMMENTARY_COLUMNS)
    .eq("game_id", gameId)
    .order("ply")
    .returns<StoredMoveCommentary[]>();

  if (moves.error !== null) {
    console.error("[profile/game] move commentary read failed", moves.error);
    return { summary: summary.data?.summary ?? null, moves: [] };
  }

  return { summary: summary.data?.summary ?? null, moves: moves.data ?? [] };
}

// Whether there is anything a coach view could show. A row can exist with a
// null summary (the generation failed halfway), so presence of the row is not
// the test; presence of words is.
export function hasCommentary(commentary: GameCommentary): boolean {
  return commentary.summary !== null || commentary.moves.length > 0;
}
