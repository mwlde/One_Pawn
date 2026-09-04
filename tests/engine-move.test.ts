import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { parseEngineMove } from "@/lib/game/engine-move";

describe("parseEngineMove", () => {
  it("reads a plain move", () => {
    expect(parseEngineMove("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(parseEngineMove("b1c3")).toEqual({ from: "b1", to: "c3" });
  });

  it("omits promotion entirely when there is none", () => {
    expect(parseEngineMove("e2e4")).not.toHaveProperty("promotion");
  });

  it("reads every promotion piece", () => {
    expect(parseEngineMove("e7e8q")).toEqual({ from: "e7", to: "e8", promotion: "q" });
    expect(parseEngineMove("e7e8r")).toEqual({ from: "e7", to: "e8", promotion: "r" });
    expect(parseEngineMove("e7e8b")).toEqual({ from: "e7", to: "e8", promotion: "b" });
    expect(parseEngineMove("e7e8n")).toEqual({ from: "e7", to: "e8", promotion: "n" });
  });

  // A NULL from the engine reaches JavaScript as an empty string, so this is
  // the shape a failed call actually arrives in.
  it("rejects anything malformed rather than throwing", () => {
    for (const bad of ["", "e2", "e2e", "e2e9", "i2i4", "e2e4k", "e2e4qq", "1234", "O-O"]) {
      expect(parseEngineMove(bad)).toBeNull();
    }
  });

  it("produces moves chess.js accepts", () => {
    const chess = new Chess();
    const parsed = parseEngineMove("g1f3");
    expect(parsed).not.toBeNull();
    expect(chess.move(parsed!).san).toBe("Nf3");
  });

  it("promotes a pawn on the board", () => {
    const chess = new Chess("8/4P3/8/7k/8/8/8/K7 w - - 0 1");
    const move = chess.move(parseEngineMove("e7e8q")!);
    expect(move.promotion).toBe("q");
    expect(move.to).toBe("e8");
    expect(chess.get("e8")).toMatchObject({ type: "q", color: "w" });
  });
});
