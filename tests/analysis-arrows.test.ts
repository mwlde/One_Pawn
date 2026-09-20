import { describe, expect, it } from "vitest";

import { buildMoveArrows } from "@/lib/analysis/arrows";
import type { Classification, MoveAnalysis } from "@/lib/analysis/types";

function analysis(
  moveUci: string,
  bestUci: string,
  classification: Classification = "blunder",
): MoveAnalysis {
  return {
    ply: 23,
    move_uci: moveUci,
    engine_best_uci: bestUci,
    eval_before: 0,
    eval_after: 0,
    eval_loss: 0,
    classification,
    is_user_move: true,
  };
}

describe("buildMoveArrows", () => {
  it("draws the engine's move first and the played move over it", () => {
    const arrows = buildMoveArrows(analysis("c6d4", "c6e5"));

    expect(arrows).toHaveLength(2);
    expect(arrows[0]).toMatchObject({ startSquare: "c6", endSquare: "e5" });
    expect(arrows[1]).toMatchObject({ startSquare: "c6", endSquare: "d4" });
  });

  it("draws one arrow when the engine agreed with the move played", () => {
    const arrows = buildMoveArrows(analysis("e2e4", "e2e4", "best"));

    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({ startSquare: "e2", endSquare: "e4" });
  });

  it("colours the played move by its classification", () => {
    const blunder = buildMoveArrows(analysis("c6d4", "c6e5", "blunder"));
    const best = buildMoveArrows(analysis("c6d4", "c6e5", "best"));

    expect(blunder[1].color).not.toBe(best[1].color);
    // The engine's arrow says the same thing whatever the move was.
    expect(blunder[0].color).toBe(best[0].color);
  });

  it("reads promotions, which carry a fifth character", () => {
    const arrows = buildMoveArrows(analysis("a7a8q", "a7b8n"));

    expect(arrows[1]).toMatchObject({ startSquare: "a7", endSquare: "a8" });
    expect(arrows[0]).toMatchObject({ startSquare: "a7", endSquare: "b8" });
  });

  it("has nothing to draw without an analysis", () => {
    expect(buildMoveArrows(null)).toEqual([]);
    expect(buildMoveArrows(undefined)).toEqual([]);
  });

  it("drops the pair rather than half-drawing an unreadable move", () => {
    expect(buildMoveArrows(analysis("garbage", "c6e5"))).toEqual([]);
  });

  it("keeps the played arrow when only the engine's move is unreadable", () => {
    const arrows = buildMoveArrows(analysis("c6d4", ""));

    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({ startSquare: "c6", endSquare: "d4" });
  });
});
