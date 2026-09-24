import type { MoveAnalysis } from "./types";

export type GameStatsSummary = {
  blunders: number;
  bestMoves: number;
};

// The post-game counts for a Play-mode game. Only the user's moves count: the
// engine's replies are not the user's play to judge.
export function summarizeUserMoves(analyses: readonly MoveAnalysis[]): GameStatsSummary {
  let blunders = 0;
  let bestMoves = 0;
  for (const analysis of analyses) {
    if (!analysis.is_user_move) continue;
    if (analysis.classification === "blunder") blunders += 1;
    if (analysis.classification === "best") bestMoves += 1;
  }
  return { blunders, bestMoves };
}
