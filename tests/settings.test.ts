import { describe, expect, it } from "vitest";

import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  depthFor,
  fromChessColor,
  opposite,
  SIDES,
  TIME_CONTROLS,
  TIME_CONTROL_IDS,
  toChessColor,
} from "@/lib/game/settings";

describe("difficulty", () => {
  it("maps each difficulty to its search depth", () => {
    expect(depthFor("easy")).toBe(3);
    expect(depthFor("medium")).toBe(5);
    expect(depthFor("hard")).toBe(6);
  });

  // Depth 7 and 8 take over 45 seconds per move in a middlegame, which is
  // longer than any of the three time controls allows. See the note on
  // DIFFICULTY_DEPTHS before raising this.
  it("keeps every depth inside what the engine can answer in time", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(depthFor(difficulty)).toBeLessThanOrEqual(6);
    }
  });

  it("gets harder as it goes", () => {
    expect(depthFor("easy")).toBeLessThan(depthFor("medium"));
    expect(depthFor("medium")).toBeLessThan(depthFor("hard"));
  });

  it("labels every difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(DIFFICULTY_LABELS[difficulty]).toBeTruthy();
    }
  });
});

describe("time controls", () => {
  it("maps each id to its base time and increment", () => {
    expect(TIME_CONTROLS["1+0"]).toMatchObject({ baseSeconds: 60, incrementSeconds: 0 });
    expect(TIME_CONTROLS["3+2"]).toMatchObject({ baseSeconds: 180, incrementSeconds: 2 });
    expect(TIME_CONTROLS["10+0"]).toMatchObject({ baseSeconds: 600, incrementSeconds: 0 });
  });

  it("lists every id it defines", () => {
    expect([...TIME_CONTROL_IDS].sort()).toEqual(Object.keys(TIME_CONTROLS).sort());
  });

  it("labels each control by its id", () => {
    for (const id of TIME_CONTROL_IDS) {
      expect(TIME_CONTROLS[id].label).toBe(id);
    }
  });
});

describe("sides", () => {
  it("has exactly two, each the opposite of the other", () => {
    expect(SIDES).toEqual(["white", "black"]);
    expect(opposite("white")).toBe("black");
    expect(opposite("black")).toBe("white");
  });

  it("round-trips through chess.js colours", () => {
    for (const side of SIDES) {
      expect(fromChessColor(toChessColor(side))).toBe(side);
    }
    expect(toChessColor("white")).toBe("w");
    expect(toChessColor("black")).toBe("b");
  });
});
