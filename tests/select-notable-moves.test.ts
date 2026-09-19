import { describe, expect, it } from "vitest";

import type { Classification, MoveAnalysis } from "@/lib/analysis/types";
import { selectNotableMoves } from "@/lib/coach/select-notable-moves";

// A user move analysis with only the fields the selector reads set to anything
// meaningful. eval_before drives the critical-moment swing; eval_loss drives the
// best-move choice; classification drives the blunder/mistake picks.
function move(
  ply: number,
  classification: Classification,
  evalLoss: number,
  evalBefore: number,
  isUserMove = true,
): MoveAnalysis {
  return {
    ply,
    move_uci: "e2e4",
    engine_best_uci: "e2e4",
    eval_before: evalBefore,
    eval_after: -evalBefore,
    eval_loss: evalLoss,
    classification,
    is_user_move: isUserMove,
  };
}

// Reads the result as a ply -> reason map, which is all the assertions care about.
function reasonsByPly(notable: ReturnType<typeof selectNotableMoves>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const item of notable) out[item.ply] = item.reason;
  return out;
}

describe("selectNotableMoves", () => {
  it("returns every blunder plus the best move plus the critical moment", () => {
    // Three blunders (plies 3, 7, 11), a clear best move (ply 9, loss 2), and a
    // critical moment on a non-blunder ply: ply 5's eval_before jumps from 20 to
    // 400, a swing of 380, the largest in the game. Five distinct plies.
    const analyses = [
      move(1, "good", 20, 30),
      move(3, "blunder", 400, 20),
      move(5, "good", 15, 400),
      move(7, "blunder", 500, 380),
      move(9, "best", 2, 370),
      move(11, "blunder", 350, 360),
    ];

    const notable = selectNotableMoves(analyses);

    expect(notable).toHaveLength(5);
    expect(reasonsByPly(notable)).toEqual({
      3: "blunder",
      5: "critical_moment",
      7: "blunder",
      9: "best_move",
      11: "blunder",
    });
    // The list comes back in ply order regardless of the order reasons were added.
    expect(notable.map((item) => item.ply)).toEqual([3, 5, 7, 9, 11]);
  });

  it("returns just the best move and the critical moment for a clean game", () => {
    // No blunders or mistakes. Best move is ply 3 (loss 5); the critical moment
    // is ply 5, whose eval_before leaps to 300 (a swing of 275).
    const analyses = [
      move(1, "good", 30, 20),
      move(3, "excellent", 5, 25),
      move(5, "good", 40, 300),
      move(7, "good", 20, 290),
    ];

    const notable = selectNotableMoves(analyses);

    expect(notable).toHaveLength(2);
    expect(reasonsByPly(notable)).toEqual({ 3: "best_move", 5: "critical_moment" });
  });

  it("collapses to one item when every move is equal quality", () => {
    // Identical classification, loss and eval_before. The best move and the
    // critical moment both resolve to the first ply (ties break earliest), so
    // the two collapse into a single best-move line.
    const analyses = [move(1, "good", 30, 50), move(3, "good", 30, 50), move(5, "good", 30, 50)];

    const notable = selectNotableMoves(analyses);

    expect(notable).toHaveLength(1);
    expect(notable[0]).toMatchObject({ ply: 1, reason: "best_move" });
  });

  it("does not add a best move or critical moment on a ply already flagged", () => {
    // Both moves are mistakes, so both are picked. The lowest-loss move (ply 3)
    // would be the best move and the biggest swing (ply 3) the critical moment,
    // but ply 3 is already claimed, so neither is added again.
    const analyses = [move(1, "mistake", 200, 30), move(3, "mistake", 150, -100)];

    const notable = selectNotableMoves(analyses);

    expect(notable).toHaveLength(2);
    expect(reasonsByPly(notable)).toEqual({ 1: "mistake", 3: "mistake" });
  });

  it("ignores moves that are not the user's own", () => {
    // The opponent's move has the lowest loss and the biggest swing, but it must
    // never be selected: only the student's moves are ever commentated.
    const analyses = [
      move(1, "good", 40, 20),
      move(2, "best", 0, 900, false),
      move(3, "good", 30, 25),
    ];

    const notable = selectNotableMoves(analyses);

    expect(notable.every((item) => item.ply !== 2)).toBe(true);
  });

  it("returns nothing for a game with no user moves", () => {
    expect(selectNotableMoves([])).toEqual([]);
    expect(selectNotableMoves([move(2, "blunder", 500, 0, false)])).toEqual([]);
  });
});
