import type { Classification } from "./types";

// Turns centipawn loss into a quality tier. Pure and engine-free: this is the
// primitive Phase 5's live coach classifies a single move through, rather than
// keeping its own copy of the thresholds.
//
// evalLoss is how many centipawns the move gave up against the engine's best,
// so it is never negative by construction (analyzeMove clamps it and pins an
// exact-best move to zero). The <= 0 branch is what makes zero loss "best" and
// also stops a stray negative from falling all the way through to "blunder".
//
// The bands are inclusive at the top: a 10cp loss is still "excellent", 11cp is
// "good", and so on up the scale. See the boundary tests in
// tests/classify-move.test.ts, which pin every edge.
export function classifyMove(evalLoss: number): Classification {
  if (evalLoss <= 0) return "best";
  if (evalLoss <= 10) return "excellent";
  if (evalLoss <= 50) return "good";
  if (evalLoss <= 100) return "inaccuracy";
  if (evalLoss <= 300) return "mistake";
  return "blunder";
}
