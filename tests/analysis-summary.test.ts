import { describe, expect, it } from "vitest";

import { summarizeUserMoves } from "@/lib/analysis/summary";
import type { Classification, MoveAnalysis } from "@/lib/analysis/types";

function row(ply: number, classification: Classification, isUserMove = true): MoveAnalysis {
  return {
    ply,
    move_uci: "e2e4",
    engine_best_uci: "e2e4",
    eval_before: 0,
    eval_after: 0,
    eval_loss: 0,
    classification,
    is_user_move: isUserMove,
  };
}

describe("summarizeUserMoves", () => {
  it("counts blunders and best moves", () => {
    const rows = [row(1, "best"), row(3, "blunder"), row(5, "best"), row(7, "good"), row(9, "blunder")];
    expect(summarizeUserMoves(rows)).toEqual({ blunders: 2, bestMoves: 2 });
  });

  it("does not count excellent as best", () => {
    expect(summarizeUserMoves([row(1, "excellent")])).toEqual({ blunders: 0, bestMoves: 0 });
  });

  it("ignores moves that are not the user's", () => {
    expect(summarizeUserMoves([row(2, "blunder", false), row(4, "best", false)])).toEqual({
      blunders: 0,
      bestMoves: 0,
    });
  });

  it("is zero for an empty game", () => {
    expect(summarizeUserMoves([])).toEqual({ blunders: 0, bestMoves: 0 });
  });
});
