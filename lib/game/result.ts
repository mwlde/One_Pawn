// Turning a finished position into the words the post-game screen shows.

import type { Chess } from "chess.js";

import { fromChessColor, opposite, type Side } from "./settings";

export type Outcome = "win" | "loss" | "draw";

// Why the game stopped, as a value rather than as the prose in `reason`. The
// saved-game result is derived from this, so the two must not be the same
// field: `reason` is UI copy and is free to be reworded, this is not.
export type EndCause =
  | "checkmate"
  | "stalemate"
  | "insufficient_material"
  | "repetition"
  | "fifty_moves"
  | "timeout"
  | "resignation"
  | "agreement";

export type GameEnd = {
  outcome: Outcome;
  // The side that won, or null for a draw. Kept alongside the outcome because
  // the outcome is relative to the user and Stage E will need the absolute one.
  winner: Side | null;
  cause: EndCause;
  headline: string;
  reason: string;
};

const HEADLINES: Record<Outcome, string> = {
  win: "You won",
  loss: "You lost",
  draw: "Draw",
};

function endFor(
  winner: Side | null,
  userSide: Side,
  cause: EndCause,
  reason: string,
): GameEnd {
  const outcome: Outcome =
    winner === null ? "draw" : winner === userSide ? "win" : "loss";
  return { outcome, winner, cause, headline: HEADLINES[outcome], reason };
}

// Reads the reason off chess.js in the order the rules resolve them: mate
// first, then the stalemate and draw conditions. Returns null while the game is
// still live, which is what makes this safe to call after every move.
export function describeEnd(chess: Chess, userSide: Side): GameEnd | null {
  if (!chess.isGameOver()) return null;

  // turn() is the side that has to move and cannot, so the winner is the other.
  const sideToMove = fromChessColor(chess.turn());

  if (chess.isCheckmate()) {
    return endFor(opposite(sideToMove), userSide, "checkmate", "by checkmate");
  }
  if (chess.isStalemate()) {
    return endFor(null, userSide, "stalemate", "by stalemate");
  }
  if (chess.isInsufficientMaterial()) {
    return endFor(null, userSide, "insufficient_material", "by insufficient material");
  }
  if (chess.isThreefoldRepetition()) {
    return endFor(null, userSide, "repetition", "by repetition");
  }
  if (chess.isDrawByFiftyMoves()) {
    return endFor(null, userSide, "fifty_moves", "by the fifty-move rule");
  }

  return endFor(null, userSide, "agreement", "by agreement");
}

// Only the player can resign. The engine plays on until it is mated or flags,
// so there is no resigning side to pass in: it is always the user.
//
// The board would call this a loss, and the post-game screen still says so. The
// games table records it as abandoned instead, which is the distinction its four
// results exist to draw.
export function describeResignation(userSide: Side): GameEnd {
  return endFor(opposite(userSide), userSide, "resignation", "by resignation");
}

// A flag is tracked by the clock rather than by chess.js, so it comes in
// separately. Note that a real arbiter would call this a draw when the side
// still on the clock has no material to mate with. That refinement is not worth
// the special case in Phase 1, and is noted here so it is not mistaken for an
// oversight later.
export function describeTimeout(flagged: Side, userSide: Side): GameEnd {
  return endFor(opposite(flagged), userSide, "timeout", "on time");
}
