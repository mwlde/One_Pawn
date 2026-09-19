import { describe, expect, it } from "vitest";

import { classifyMove } from "@/lib/analysis/classify-move";

describe("classifyMove", () => {
  // The bands are inclusive at the top, so every test here pins both sides of a
  // boundary: the last value that stays in a tier and the first that leaves it.
  // A one-sided test would pass even if a `<` were quietly a `<=`.
  it("classes exactly zero loss as best", () => {
    expect(classifyMove(0)).toBe("best");
  });

  it("classes a positive loss up to 10 as excellent", () => {
    expect(classifyMove(1)).toBe("excellent");
    expect(classifyMove(10)).toBe("excellent");
  });

  it("crosses from excellent to good at 11", () => {
    expect(classifyMove(11)).toBe("good");
    expect(classifyMove(50)).toBe("good");
  });

  it("crosses from good to inaccuracy at 51", () => {
    expect(classifyMove(51)).toBe("inaccuracy");
    expect(classifyMove(100)).toBe("inaccuracy");
  });

  it("crosses from inaccuracy to mistake at 101", () => {
    expect(classifyMove(101)).toBe("mistake");
    expect(classifyMove(300)).toBe("mistake");
  });

  it("crosses from mistake to blunder past 300", () => {
    expect(classifyMove(301)).toBe("blunder");
    expect(classifyMove(1500)).toBe("blunder");
  });

  it("treats a mate-sized loss as a blunder", () => {
    // Missing a forced mate produces a loss in the tens of thousands. It must
    // land in the top tier, not overflow past it.
    expect(classifyMove(29_995)).toBe("blunder");
  });

  it("never returns worse than best for a clamped negative loss", () => {
    // analyzeMove clamps loss at zero, but the classifier is pure and may be
    // handed a negative by a future caller. It must read as best, not blunder.
    expect(classifyMove(-5)).toBe("best");
  });
});
