import { Chess } from "chess.js";

import { parseEngineMove } from "@/lib/game/engine-move";

import { classifyMove } from "./classify-move";
import type { AnalysisEngine, MoveAnalysisResult } from "./types";

// Applies one move to a position and returns the FEN that results. Kept
// separate so the two failure modes it owns, a garbled move string and a move
// that is not legal here, each surface as a clear error rather than a chess.js
// throw the caller has to guess at.
function fenAfter(fenBefore: string, uci: string): string {
  const parsed = parseEngineMove(uci);
  if (parsed === null) {
    throw new Error(`Move is not well-formed long algebraic notation: ${uci}`);
  }

  const chess = new Chess(fenBefore);
  try {
    chess.move(parsed);
  } catch {
    throw new Error(`Move ${uci} is not legal in position ${fenBefore}`);
  }
  return chess.fen();
}

// The core evaluation loop, for a single position and a single move played from
// it. This is the primitive both game analysis (4A) and the Phase 5 live coach
// build on, so it takes one move and knows nothing about whose move it was, how
// many came before it, or that it is being persisted.
//
// One convention underpins everything: evaluatePosition scores a position from
// the side-to-move's perspective. Playing a move hands the turn to the
// opponent, so the eval of the position *after* a move is from the OPPONENT's
// point of view; negating it reads that position back in the moving player's
// terms. That single sign flip is the difference between "how good is this for
// me" and "how good is this for the person I just handed the move to".
//
// The loss is measured by comparing two positions of the same age: the one the
// engine's best move reaches and the one the played move reaches, each searched
// to the same depth. That symmetry is deliberate. Comparing the position before
// the move against the position after it instead would pit a depth-N search
// against an effectively depth-(N+1) one, and the difference between those two
// horizons shows up as a fixed penalty on every move, best moves included (on
// the opening position this engine, with no quiescence search, reports it as
// over 100cp). Evaluating both successor positions the same way cancels it, so a
// best move scores a true zero and every other move is measured against it
// honestly.
export async function analyzeMove(
  fenBefore: string,
  playedMoveUci: string,
  engine: AnalysisEngine,
  depth: number,
): Promise<MoveAnalysisResult> {
  const engineBestUci = await engine.getBestMove(fenBefore, depth);

  // The played move's resulting position, from the opponent's perspective (the
  // schema stores eval_after that way). Negated, it is the played line's value
  // in the moving player's terms.
  const fenAfterPlayed = fenAfter(fenBefore, playedMoveUci);
  const evalAfter = await engine.evaluatePosition(fenAfterPlayed, depth);
  const playedScore = -evalAfter;

  // The best line's value, in the moving player's terms. When the played move
  // *is* the engine's choice the two lines are identical, so its value is
  // reused rather than searched again: one fewer engine call, and a guaranteed
  // exact zero loss.
  let bestScore: number;
  if (playedMoveUci === engineBestUci) {
    bestScore = playedScore;
  } else {
    const fenAfterBest = fenAfter(fenBefore, engineBestUci);
    bestScore = -(await engine.evaluatePosition(fenAfterBest, depth));
  }

  // eval_before is the position's value under best play, in the moving player's
  // terms: the most they could have got. The loss is how far the played line
  // fell short of it, clamped so search noise can never make it negative.
  const evalBefore = bestScore;
  const evalLoss = Math.max(0, bestScore - playedScore);

  return {
    engineBestUci,
    evalBefore,
    evalAfter,
    evalLoss,
    classification: classifyMove(evalLoss),
  };
}
