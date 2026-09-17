// Decides what a dragged move means for the lesson step on the board. Pure: it
// takes the step and the move and returns a verdict, and the player turns that
// verdict into state and copy.

import { Chess } from "chess.js";

import { parseEngineMove } from "@/lib/game/engine-move";

import type { LessonStep } from "./types";

export type MoveVerdict =
  // The step is done. fen is the position to show, including any opponent reply.
  | { result: "correct"; fen: string }
  // The user tried exactly the attempt step's move. Done, and the board stays.
  | { result: "attempted" }
  // The rules rejected the move.
  | { result: "illegal" }
  // A legal move, but not one this step accepts.
  | { result: "wrong" }
  // The piece was put back where it started. Not a move, and not a mistake.
  | { result: "none" };

// Judged from step.fen every time. A wrong move never changes the board, so
// until a step is done the position on it is always the step's own.
export function judgeMove(step: LessonStep, from: string, to: string): MoveVerdict {
  if (from === to) return { result: "none" };

  // Checked before chess.js, which would reject the move and lose the
  // difference between this and any other illegal drop. Squares only: the
  // board auto-queens, so a promotion suffix can never be chosen by the user.
  if (step.kind === "attempt" && from + to === step.attemptedMove.slice(0, 4)) {
    return { result: "attempted" };
  }

  const chess = new Chess(step.fen);
  let uci: string;
  try {
    // Auto-queen, as on the play screen: the board has no promotion picker.
    // For a move that is not a promotion, chess.js ignores the field.
    const move = chess.move({ from, to, promotion: "q" });
    uci = move.from + move.to + (move.promotion ?? "");
  } catch {
    return { result: "illegal" };
  }

  if (step.kind === "attempt" || !step.acceptedMoves.includes(uci)) {
    return { result: "wrong" };
  }

  if (step.opponentReply !== undefined) {
    // A malformed or illegal reply is a content error, not a user error, so
    // it throws. Loading checks the shape of a move but does not replay it.
    const reply = parseEngineMove(step.opponentReply);
    if (reply === null) throw new Error(`Step "${step.id}" has a malformed opponentReply.`);
    chess.move(reply);
  }

  return { result: "correct", fen: chess.fen() };
}
