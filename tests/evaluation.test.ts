import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { formatBalance, materialBalance, whiteShare } from "@/lib/game/evaluation";

describe("materialBalance", () => {
  it("is level at the start", () => {
    expect(materialBalance(new Chess())).toBe(0);
  });

  it("is positive when White is up and negative when Black is", () => {
    // Black is a queen down.
    expect(materialBalance(new Chess("rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"))).toBe(9);
    // White is a rook down.
    expect(materialBalance(new Chess("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w Kkq - 0 1"))).toBe(-5);
  });

  it("uses the standard piece values and ignores kings", () => {
    expect(materialBalance(new Chess("4k3/8/8/8/8/8/8/4K3 w - - 0 1"))).toBe(0);
    expect(materialBalance(new Chess("4k3/8/8/8/8/8/P7/4K3 w - - 0 1"))).toBe(1);
    expect(materialBalance(new Chess("4k3/8/8/8/8/8/N7/4K3 w - - 0 1"))).toBe(3);
    expect(materialBalance(new Chess("4k3/8/8/8/8/8/B7/4K3 w - - 0 1"))).toBe(3);
    expect(materialBalance(new Chess("4k3/8/8/8/8/8/R7/4K3 w - - 0 1"))).toBe(5);
    expect(materialBalance(new Chess("4k3/8/8/8/8/8/Q7/4K3 w - - 0 1"))).toBe(9);
  });

  it("tracks a capture made on the board", () => {
    const chess = new Chess();
    chess.move("e4");
    chess.move("d5");
    expect(materialBalance(chess)).toBe(0);
    chess.move("exd5");
    expect(materialBalance(chess)).toBe(1);
  });
});

describe("whiteShare", () => {
  it("puts a level position in the middle of the bar", () => {
    expect(whiteShare(0)).toBe(0.5);
  });

  it("clamps beyond ten pawns in either direction", () => {
    expect(whiteShare(10)).toBe(1);
    expect(whiteShare(40)).toBe(1);
    expect(whiteShare(-10)).toBe(0);
    expect(whiteShare(-40)).toBe(0);
  });

  it("rises with White's advantage and stays inside the bar", () => {
    const shares = [-12, -5, -1, 0, 1, 5, 12].map(whiteShare);
    for (let i = 1; i < shares.length; i += 1) {
      expect(shares[i]).toBeGreaterThanOrEqual(shares[i - 1]);
      expect(shares[i]).toBeGreaterThanOrEqual(0);
      expect(shares[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe("formatBalance", () => {
  it("signs the number and always shows one decimal", () => {
    expect(formatBalance(0)).toBe("0.0");
    expect(formatBalance(3)).toBe("+3.0");
    expect(formatBalance(-1.5)).toBe("-1.5");
    expect(formatBalance(0.5)).toBe("+0.5");
  });

  it("never signs a level position", () => {
    expect(formatBalance(0)).not.toContain("+");
    expect(formatBalance(0)).not.toContain("-");
  });
});
