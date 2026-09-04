import { describe, expect, it } from "vitest";

import { applyIncrement, deduct, formatClock, initialClocks } from "@/lib/game/clock";

describe("formatClock", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatClock(600_000)).toBe("10:00");
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(60_000)).toBe("1:00");
    expect(formatClock(9_000)).toBe("0:09");
  });

  // Rounding up is what makes 0:00 mean "flagged" rather than "under a second
  // left". Rounding down would show 0:00 for a whole second of live play.
  it("rounds up, so 0:00 only appears once the time is gone", () => {
    expect(formatClock(1)).toBe("0:01");
    expect(formatClock(999)).toBe("0:01");
    expect(formatClock(1_000)).toBe("0:01");
    expect(formatClock(1_001)).toBe("0:02");
    expect(formatClock(0)).toBe("0:00");
  });

  it("treats a negative remainder as zero", () => {
    expect(formatClock(-5_000)).toBe("0:00");
  });
});

describe("initialClocks", () => {
  it("gives both sides the same time in milliseconds", () => {
    expect(initialClocks(180)).toEqual({ white: 180_000, black: 180_000 });
  });
});

describe("deduct", () => {
  it("charges only the side that was thinking", () => {
    expect(deduct(initialClocks(180), "white", 5_000)).toEqual({
      white: 175_000,
      black: 180_000,
    });
  });

  it("floors at zero rather than going negative", () => {
    expect(deduct(initialClocks(1), "black", 9_999).black).toBe(0);
  });

  it("does not mutate the clocks it is given", () => {
    const before = initialClocks(60);
    deduct(before, "white", 1_000);
    expect(before).toEqual(initialClocks(60));
  });
});

describe("applyIncrement", () => {
  it("pays the increment to the mover only", () => {
    expect(applyIncrement(initialClocks(180), "black", 2)).toEqual({
      white: 180_000,
      black: 182_000,
    });
  });

  it("is a no-op when the time control has no increment", () => {
    expect(applyIncrement(initialClocks(60), "white", 0)).toEqual(initialClocks(60));
  });
});

describe("a move's worth of clock arithmetic", () => {
  // The order the game screen uses: charge the time used, then pay the
  // increment. Reversing it would hand back time a player had already lost.
  it("charges elapsed time before crediting the increment", () => {
    const start = initialClocks(180);
    const after = applyIncrement(deduct(start, "white", 4_000), "white", 2);
    expect(after.white).toBe(178_000);
    expect(after.black).toBe(180_000);
  });

  it("cannot revive a flagged clock with an increment it never earned", () => {
    const flagged = deduct(initialClocks(1), "white", 1_000);
    expect(flagged.white).toBe(0);
  });
});
