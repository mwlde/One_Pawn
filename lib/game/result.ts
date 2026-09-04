// Turning a finished position into the words the post-game screen shows.

import type { Chess } from "chess.js";

import { fromChessColor, opposite, type Side } from "./settings";

export type Outcome = "win" | "loss" | "draw";

export type GameEnd = {
  outcome: Outcome;
  // The side that won, or null for a draw. Kept alongside the outcome because
  // the outcome is relative to the user and Stage E will need the absolute one.
  winner: Side | null;
  headline: string;
  reason: string;
};

const HEADLINES: Record<Outcome, string> = {
  win: "You won",
  loss: "You lost",
  draw: "Draw",
};

function endFor(winner: Side | null, userSide: Side, reason: string): GameEnd {
  const outcome: Outcome =
    winner === null ? "draw" : winner === userSide ? "win" : "loss";
  return { outcome, winner, headline: HEADLINES[outcome], reason };
}

// Reads the reason off chess.js in the order the rules resolve them: mate
// first, then the stalemate and draw conditions. Returns null while the game is
// still live, which is what makes this safe to call after every move.
export function describeEnd(chess: Chess, userSide: Side): GameEnd | null {
  if (!chess.isGameOver()) return null;

  // turn() is the side that has to move and cannot, so the winner is the other.
  const sideToMove = fromChessColor(chess.turn());

  if (chess.isCheckmate()) {
    return endFor(opposite(sideToMove), userSide, "by checkmate");
  }
  if (chess.isStalemate()) {
    return endFor(null, userSide, "by stalemate");
  }
  if (chess.isInsufficientMaterial()) {
    return endFor(null, userSide, "by insufficient material");
  }
  if (chess.isThreefoldRepetition()) {
    return endFor(null, userSide, "by repetition");
  }
  if (chess.isDrawByFiftyMoves()) {
    return endFor(null, userSide, "by the fifty-move rule");
  }

  return endFor(null, userSide, "by agreement");
}

// A flag is tracked by the clock rather than by chess.js, so it comes in
// separately. Note that a real arbiter would call this a draw when the side
// still on the clock has no material to mate with. That refinement is not worth
// the special case in Phase 1, and is noted here so it is not mistaken for an
// oversight later.
export function describeTimeout(flagged: Side, userSide: Side): GameEnd {
  return endFor(opposite(flagged), userSide, "on time");
}
