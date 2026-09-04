import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { describeEnd, describeTimeout } from "@/lib/game/result";

// Fool's mate. Black delivers checkmate on move two.
function foolsMate(): Chess {
  const chess = new Chess();
  for (const san of ["f3", "e5", "g4", "Qh4#"]) chess.move(san);
  return chess;
}

describe("describeEnd", () => {
  it("returns null while the game is still live", () => {
    expect(describeEnd(new Chess(), "white")).toBeNull();

    const chess = new Chess();
    chess.move("e4");
    expect(describeEnd(chess, "white")).toBeNull();
    expect(describeEnd(chess, "black")).toBeNull();
  });

  describe("checkmate", () => {
    it("names the side that delivered it as the winner", () => {
      expect(describeEnd(foolsMate(), "white")?.winner).toBe("black");
    });

    it("reads the result from the user's point of view", () => {
      expect(describeEnd(foolsMate(), "black")).toMatchObject({
        outcome: "win",
        headline: "You won",
        reason: "by checkmate",
      });
      expect(describeEnd(foolsMate(), "white")).toMatchObject({
        outcome: "loss",
        headline: "You lost",
        reason: "by checkmate",
      });
    });
  });

  describe("draws", () => {
    it("recognises stalemate", () => {
      const chess = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
      expect(chess.isStalemate()).toBe(true);
      expect(describeEnd(chess, "white")).toMatchObject({
        outcome: "draw",
        headline: "Draw",
        reason: "by stalemate",
        winner: null,
      });
    });

    it("recognises insufficient material", () => {
      const chess = new Chess("8/8/8/4k3/8/8/8/4K2B w - - 0 1");
      expect(chess.isInsufficientMaterial()).toBe(true);
      expect(describeEnd(chess, "black")?.reason).toBe("by insufficient material");
    });

    it("recognises threefold repetition", () => {
      const chess = new Chess();
      for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) {
        chess.move(san);
      }
      expect(chess.isThreefoldRepetition()).toBe(true);
      expect(describeEnd(chess, "white")?.reason).toBe("by repetition");
    });

    it("recognises the fifty-move rule", () => {
      const chess = new Chess("8/8/8/4k3/8/8/4R3/4K3 w - - 100 200");
      expect(chess.isDrawByFiftyMoves()).toBe(true);
      expect(describeEnd(chess, "white")?.reason).toBe("by the fifty-move rule");
    });

    it("reads as a draw for either player", () => {
      const chess = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
      expect(describeEnd(chess, "white")?.outcome).toBe("draw");
      expect(describeEnd(chess, "black")?.outcome).toBe("draw");
    });
  });
});

describe("describeTimeout", () => {
  it("makes the side that flagged the loser", () => {
    expect(describeTimeout("white", "white")).toMatchObject({
      outcome: "loss",
      headline: "You lost",
      reason: "on time",
      winner: "black",
    });
  });

  it("makes the other side the winner", () => {
    expect(describeTimeout("black", "white")).toMatchObject({
      outcome: "win",
      headline: "You won",
      reason: "on time",
      winner: "white",
    });
  });

  it("never produces a draw", () => {
    for (const flagged of ["white", "black"] as const) {
      for (const user of ["white", "black"] as const) {
        expect(describeTimeout(flagged, user).outcome).not.toBe("draw");
      }
    }
  });
});
