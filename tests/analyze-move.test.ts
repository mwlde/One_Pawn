import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { analyzeMove } from "@/lib/analysis/analyze-move";
import type { AnalysisEngine } from "@/lib/analysis/types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// The position a move reaches from the start, so the stub below can key its
// scores on the actual successor FENs analyzeMove will ask about.
function childFen(uci: string): string {
  const chess = new Chess(START_FEN);
  chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  });
  return chess.fen();
}

// A stub engine. It reports `best` as the top move and answers evaluatePosition
// from a map keyed on each successor position, so the best line and the played
// line can be given different scores. Every score is from the side-to-move's
// perspective, as the real engine's is: after a move it is the opponent to
// move, so a positive score there means the move turned out well for the
// opponent, i.e. badly for the player.
function makeEngine(
  best: string,
  scores: Record<string, number>,
): AnalysisEngine {
  const byFen = new Map<string, number>();
  for (const [uci, score] of Object.entries(scores)) {
    byFen.set(childFen(uci), score);
  }
  return {
    getBestMove: async () => best,
    evaluatePosition: async (fen: string) => {
      const score = byFen.get(fen);
      if (score === undefined) throw new Error(`stub has no score for ${fen}`);
      return score;
    },
  };
}

describe("analyzeMove", () => {
  it("scores the engine's own top choice as an exact zero loss", async () => {
    // played === best, so the best line is never searched separately and the
    // loss is a guaranteed zero, whatever the resulting eval happens to be.
    const engine = makeEngine("e2e4", { e2e4: -30 });

    const result = await analyzeMove(START_FEN, "e2e4", engine, 5);

    expect(result.engineBestUci).toBe("e2e4");
    expect(result.evalLoss).toBe(0);
    expect(result.classification).toBe("best");
  });

  it("measures loss between the best line and the played line, in the player's terms", async () => {
    // After the best move the opponent sees -40 (so the player is +40); after
    // the played move the opponent sees -30 (the player +30). The move cost
    // 40 - 30 = 10: an excellent move, just short of the best.
    const engine = makeEngine("d2d4", { d2d4: -40, e2e4: -30 });

    const result = await analyzeMove(START_FEN, "e2e4", engine, 5);

    expect(result.evalBefore).toBe(40);
    expect(result.evalAfter).toBe(-30);
    expect(result.evalLoss).toBe(10);
    expect(result.classification).toBe("excellent");
  });

  it("reads a move that hands the opponent a winning position as a blunder", async () => {
    // Best line leaves the player +30 (opponent -30); the played move leaves the
    // opponent a queen up at +900. Loss is 900 - (-30) = 930.
    const engine = makeEngine("d2d4", { d2d4: -30, e2e4: 900 });

    const result = await analyzeMove(START_FEN, "e2e4", engine, 5);

    expect(result.evalAfter).toBe(900);
    expect(result.evalLoss).toBe(930);
    expect(result.classification).toBe("blunder");
  });

  it("clamps loss at zero when the played line evaluates better than the best", async () => {
    // Search noise can make a non-best line look stronger than the top choice.
    // The raw difference would be negative; the clamp reports zero, not a
    // nonsensical negative loss.
    const engine = makeEngine("d2d4", { d2d4: -20, e2e4: -40 });

    const result = await analyzeMove(START_FEN, "e2e4", engine, 5);

    expect(result.evalLoss).toBe(0);
    expect(result.classification).toBe("best");
  });

  it("rejects a move string that is not long algebraic", async () => {
    const engine = makeEngine("e2e4", { e2e4: 0 });
    await expect(analyzeMove(START_FEN, "castle", engine, 5)).rejects.toThrow(/well-formed/);
  });

  it("rejects a move that is not legal in the position", async () => {
    const engine = makeEngine("e2e4", { e2e4: 0 });
    // e2e5 is a two-and-a-half square pawn move: well-formed, but illegal.
    await expect(analyzeMove(START_FEN, "e2e5", engine, 5)).rejects.toThrow(/not legal/);
  });
});
