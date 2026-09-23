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
  // longer than any of the time controls allows. See the note on
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
    expect(TIME_CONTROLS["3+2"]).toMatchObject({ baseSeconds: 180, incrementSeconds: 2 });
    expect(TIME_CONTROLS["5+0"]).toMatchObject({ baseSeconds: 300, incrementSeconds: 0 });
    expect(TIME_CONTROLS["10+0"]).toMatchObject({ baseSeconds: 600, incrementSeconds: 0 });
  });

  it("gives 15+10 fifteen minutes and a ten-second increment", () => {
    expect(TIME_CONTROLS["15+10"]).toMatchObject({ baseSeconds: 900, incrementSeconds: 10 });
  });

  it("gives 30+0 half an hour and no increment", () => {
    expect(TIME_CONTROLS["30+0"]).toMatchObject({ baseSeconds: 1800, incrementSeconds: 0 });
  });

  // The shortest option is 3 minutes: a 1-minute bullet game is too fast for a
  // learner and was dropped on purpose.
  it("offers the controls in ascending order of base time, none shorter than 3 min", () => {
    expect(TIME_CONTROL_IDS).toEqual(["3+2", "5+0", "10+0", "15+10", "30+0"]);
    expect(TIME_CONTROLS[TIME_CONTROL_IDS[0]].baseSeconds).toBe(180);
  });

  it("lists every id it defines", () => {
    expect([...TIME_CONTROL_IDS].sort()).toEqual(Object.keys(TIME_CONTROLS).sort());
  });

  // The label is the human-facing name (minutes), not the shorthand id: a
  // family tester reads "10 min", not "10+0".
  it("labels each control in plain minutes and names its category", () => {
    for (const id of TIME_CONTROL_IDS) {
      const control = TIME_CONTROLS[id];
      expect(control.label).toBe(`${control.baseSeconds / 60} min`);
      expect(["Blitz", "Rapid", "Classical"]).toContain(control.category);
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
