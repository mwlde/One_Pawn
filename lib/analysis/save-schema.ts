// The validator for POST /api/games/[id]/analyze. Kept out of the modules the
// replay screen imports, so zod stays out of the client bundle: the client
// builds this payload but never checks it, the same split lib/game/save-schema.ts
// keeps.

import { z } from "zod";

import { CLASSIFICATIONS } from "./types";

// Long algebraic, the one move format the engine and chess.js both speak:
// from-square, to-square, optional promotion letter. Same shape parseEngineMove
// accepts in lib/game/engine-move.ts.
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const moveAnalysisSchema = z.object({
  ply: z.number().int().positive().max(1000),
  move_uci: z.string().regex(UCI),
  engine_best_uci: z.string().regex(UCI),
  // Evals are centipawns and may be negative (a losing position for the side to
  // move) or mate-sized (tens of thousands). eval_loss alone is never negative.
  eval_before: z.number().int(),
  eval_after: z.number().int(),
  eval_loss: z.number().int().min(0),
  classification: z.enum(CLASSIFICATIONS),
  is_user_move: z.boolean(),
});

// A game is at most 1000 plies (the save route's ceiling), so its analyses can
// be no more numerous. The floor of 1 rejects an empty submission, which is a
// caller mistake rather than a game with nothing to analyse.
export const saveAnalysisSchema = z.object({
  moves: z.array(moveAnalysisSchema).min(1).max(1000),
});
