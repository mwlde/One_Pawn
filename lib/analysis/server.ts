// Reading a game's stored analysis from a Server Component. The client
// transport in client.ts goes through the API route because it has to; a page
// rendering on the server can query directly, and that is what lets the replay
// screen know whether it has an analysis before it paints anything.
//
// RLS gates the read: the request's own session is what the server client
// carries, so a row of someone else's game simply is not returned.

import type { createClient } from "@/lib/supabase/server";

import type { StoredAnalysis } from "./client";

const ANALYSIS_COLUMNS =
  "ply, move_uci, engine_best_uci, eval_before, eval_after, eval_loss, classification, is_user_move, created_at";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Every analysed move of a game, in ply order. An empty list is the normal
// answer for a game nobody has analysed. A failed read is also an empty list:
// the screen still works, it just offers to run the analysis, which is a better
// outcome than a 500 over a panel the user may not even open.
export async function readStoredAnalysis(
  supabase: ServerClient,
  gameId: string,
): Promise<StoredAnalysis[]> {
  const { data, error } = await supabase
    .from("move_analyses")
    .select(ANALYSIS_COLUMNS)
    .eq("game_id", gameId)
    .order("ply")
    .returns<StoredAnalysis[]>();

  if (error !== null) {
    console.error("[profile/game] analysis read failed", error);
    return [];
  }

  return data ?? [];
}
