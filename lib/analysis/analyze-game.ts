import { Chess } from "chess.js";

import { fromChessColor, type Side } from "@/lib/game/settings";

import { analyzeMove } from "./analyze-move";
import type { AnalysisEngine, MoveAnalysis } from "./types";

// Walks a finished game and analyses the user's moves, one at a time, on the
// engine. Only the user's moves: the opponent's are the engine's own play, and
// classifying the engine against itself would be noise. The is_user_move column
// still exists for a later phase that wants both sides, but this phase writes
// only the rows it shows.
//
// depth is a parameter, not a constant, for the same reason analyzeMove takes
// one: the live coach in Phase 5 will call this loop at a different depth, and a
// hardcoded value here would be exactly the "post-game assumption" the analysis
// layer is meant to stay clear of.
//
// onProgress reports completed user moves out of the total to analyse, so a
// caller can drive a progress bar that reads "move X of Y" and advances once
// per position actually searched, rather than jumping over the opponent's plies.
export async function analyzeGame(
  pgn: string,
  userColor: Side,
  engine: AnalysisEngine,
  depth: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<MoveAnalysis[]> {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    // A PGN this app did not write, or one from a chess.js version that
    // disagrees with this one. There is no game to analyse.
    throw new Error("This game's moves could not be read, so it cannot be analysed.");
  }

  // verbose gives each move's colour and, crucially, `before`: the FEN of the
  // position the move was played from. That is exactly what analyzeMove needs,
  // and taking it from the move avoids replaying the game a second time.
  const history = chess.history({ verbose: true });

  const userPlies = history.filter((move) => fromChessColor(move.color) === userColor).length;

  const analyses: MoveAnalysis[] = [];
  let completed = 0;

  for (let index = 0; index < history.length; index += 1) {
    const move = history[index];
    if (fromChessColor(move.color) !== userColor) continue;

    // chess.js speaks the same long algebraic the engine does: from-square,
    // to-square, and a promotion letter when there is one. This is the exact
    // string analyzeMove compares against the engine's own best move, so it
    // must be built the same way engine-move.ts parses it.
    const moveUci = `${move.from}${move.to}${move.promotion ?? ""}`;

    const result = await analyzeMove(move.before, moveUci, engine, depth);

    analyses.push({
      // 1-indexed ply across the whole game: ply 1 is White's first move,
      // which is what the schema's unique (game_id, ply) keys on.
      ply: index + 1,
      move_uci: moveUci,
      engine_best_uci: result.engineBestUci,
      eval_before: result.evalBefore,
      eval_after: result.evalAfter,
      eval_loss: result.evalLoss,
      classification: result.classification,
      is_user_move: true,
    });

    completed += 1;
    onProgress?.(completed, userPlies);
  }

  return analyses;
}
