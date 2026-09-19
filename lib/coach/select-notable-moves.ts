// Picks which of a game's analysed moves are worth a line of commentary. Pure
// and engine-free: it reads the stored analysis and returns a short, ordered
// list of moves with the reason each one made the cut. The route turns that list
// into Groq calls, so the length of this list is exactly the number of per-move
// LLM calls a game costs. Keeping it small is a cost decision, not just a UI one.
//
// The rules (from the 4B brief):
//   - every user move classified as a blunder or a mistake,
//   - the user's single best move (the lowest eval loss),
//   - the critical moment: the user turn where the evaluation swung the most.
// A single ply gets at most one line. If the best move or the critical moment
// lands on a ply already picked as a blunder or mistake, it is not added again,
// and if the critical moment is also the best move, only the best-move line is
// kept. Commenting on the same move twice would spend a second Groq call to say
// the same thing.

import type { MoveAnalysis } from "@/lib/analysis/types";

import type { CommentaryReason } from "./types";

export type NotableMove = {
  ply: number;
  reason: CommentaryReason;
  // The analysis row this decision was made from, so the caller does not have to
  // look it up again to build the prompt.
  analysis: MoveAnalysis;
};

// The lowest-eval-loss move, breaking ties toward the earlier ply so the choice
// is deterministic. Returns null only for an empty list.
function bestMove(moves: MoveAnalysis[]): MoveAnalysis | null {
  let best: MoveAnalysis | null = null;
  for (const move of moves) {
    if (
      best === null ||
      move.eval_loss < best.eval_loss ||
      (move.eval_loss === best.eval_loss && move.ply < best.ply)
    ) {
      best = move;
    }
  }
  return best;
}

// The critical moment: the user turn whose eval_before differs most from the
// previous user turn's, in either direction. eval_before is the position's value
// under best play from the student's point of view, so this series tracks how
// the student's standing rose and fell across their own turns. The first turn is
// measured against equality (0), so a one-move game still has a turning point and
// a decisive first move can be the critical one. Ties break toward the earlier
// ply. Returns null only for an empty list.
//
// This is a heuristic for "which single move is worth explaining as the turn of
// the game", not a precise metric. It folds the opponent's replies into each
// swing, which is the point: the turning point is often the student seizing or
// losing the initiative across a pair of moves, not a move in isolation.
function criticalMoment(movesInPlyOrder: MoveAnalysis[]): MoveAnalysis | null {
  let critical: MoveAnalysis | null = null;
  let largestSwing = -1;
  let previous = 0;

  for (const move of movesInPlyOrder) {
    const swing = Math.abs(move.eval_before - previous);
    if (swing > largestSwing) {
      largestSwing = swing;
      critical = move;
    }
    previous = move.eval_before;
  }

  return critical;
}

export function selectNotableMoves(analyses: MoveAnalysis[]): NotableMove[] {
  // Only the student's own moves are ever commentated. In this phase the stored
  // analysis holds nothing else, but the filter keeps the selector honest if a
  // later phase starts storing the opponent's moves too.
  const userMoves = analyses.filter((move) => move.is_user_move);
  if (userMoves.length === 0) return [];

  const byPly = [...userMoves].sort((a, b) => a.ply - b.ply);

  const notable: NotableMove[] = [];
  const claimed = new Set<number>();

  // 1. Blunders and mistakes, in ply order. These are the moves the student most
  //    needs to see, so they are added first and own their plies.
  for (const move of byPly) {
    if (move.classification === "blunder" || move.classification === "mistake") {
      notable.push({ ply: move.ply, reason: move.classification, analysis: move });
      claimed.add(move.ply);
    }
  }

  // 2. The best move, unless that ply is already spoken for (which only happens
  //    when every move was at least a mistake, in which case "best" is not a
  //    thing worth celebrating).
  const best = bestMove(byPly);
  if (best !== null && !claimed.has(best.ply)) {
    notable.push({ ply: best.ply, reason: "best_move", analysis: best });
    claimed.add(best.ply);
  }

  // 3. The critical moment, unless its ply is already covered. This is where the
  //    best-is-also-critical dedup falls out: the best move claimed its ply in
  //    step 2, so the critical line is skipped rather than repeating it.
  const critical = criticalMoment(byPly);
  if (critical !== null && !claimed.has(critical.ply)) {
    notable.push({ ply: critical.ply, reason: "critical_moment", analysis: critical });
    claimed.add(critical.ply);
  }

  // Ply order for a stable, readable list. The reasons above are added out of
  // order (all blunders, then best, then critical), and the view reads top to
  // bottom by move number.
  return notable.sort((a, b) => a.ply - b.ply);
}
