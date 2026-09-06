import { describe, expect, it } from "vitest";

import {
  computeStats,
  formatMoveCount,
  formatPlayedAt,
  formatWinRate,
  resultLabel,
  type GameSummary,
} from "@/lib/game/history";

// Only the fields the functions under test read. The rest of the row is filled
// in so the type is satisfied and is never looked at.
function game(partial: Partial<GameSummary>): GameSummary {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    result: "white_wins",
    user_color: "white",
    difficulty: 5,
    time_control: "10+0",
    move_count: 40,
    played_at: "2026-09-01T12:00:00.000Z",
    ...partial,
  };
}

describe("resultLabel", () => {
  // Every combination of the four results and the two colours.
  it("reads a win as the user's own", () => {
    expect(resultLabel("white_wins", "white")).toBe("You won");
    expect(resultLabel("black_wins", "black")).toBe("You won");
  });

  it("reads the other side's win as a loss", () => {
    expect(resultLabel("black_wins", "white")).toBe("You lost");
    expect(resultLabel("white_wins", "black")).toBe("You lost");
  });

  it("reads a draw the same way for both colours", () => {
    expect(resultLabel("draw", "white")).toBe("Draw");
    expect(resultLabel("draw", "black")).toBe("Draw");
  });

  it("reads abandoned as a resignation, whichever colour the user held", () => {
    expect(resultLabel("abandoned", "white")).toBe("You resigned");
    expect(resultLabel("abandoned", "black")).toBe("You resigned");
  });
});

describe("computeStats", () => {
  it("counts nothing for an empty history", () => {
    expect(computeStats([])).toEqual({
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      resigned: 0,
      winRate: null,
    });
  });

  it("counts each outcome from the user's point of view", () => {
    const games = [
      game({ result: "white_wins", user_color: "white" }),
      game({ result: "black_wins", user_color: "black" }),
      game({ result: "white_wins", user_color: "black" }),
      game({ result: "draw", user_color: "white" }),
      game({ result: "abandoned", user_color: "black" }),
    ];

    expect(computeStats(games)).toMatchObject({
      played: 5,
      wins: 2,
      losses: 1,
      draws: 1,
      resigned: 1,
    });
  });

  it("leaves draws out of the win rate and resignations in", () => {
    // Two wins, one draw, one resignation: 2 of the 3 non-draw games.
    const games = [
      game({ result: "white_wins", user_color: "white" }),
      game({ result: "black_wins", user_color: "black" }),
      game({ result: "draw", user_color: "white" }),
      game({ result: "abandoned", user_color: "white" }),
    ];

    expect(computeStats(games).winRate).toBe(67);
  });

  it("has no win rate when every game was a draw", () => {
    const games = [game({ result: "draw" }), game({ result: "draw" })];

    expect(computeStats(games).winRate).toBeNull();
    expect(formatWinRate(computeStats(games).winRate)).toBe("--");
  });
});

describe("formatPlayedAt", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");

  function ago(milliseconds: number): string {
    return formatPlayedAt(new Date(now.getTime() - milliseconds).toISOString(), now);
  }

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it("says just now inside the first minute", () => {
    expect(ago(0)).toBe("just now");
    expect(ago(59 * 1000)).toBe("just now");
  });

  it("counts minutes up to the hour", () => {
    expect(ago(MINUTE)).toBe("1 minute ago");
    expect(ago(3 * MINUTE)).toBe("3 minutes ago");
    expect(ago(59 * MINUTE)).toBe("59 minutes ago");
  });

  it("counts hours up to the day", () => {
    expect(ago(HOUR)).toBe("1 hour ago");
    expect(ago(3 * HOUR)).toBe("3 hours ago");
    expect(ago(23 * HOUR)).toBe("23 hours ago");
  });

  it("counts days up to a week", () => {
    expect(ago(DAY)).toBe("1 day ago");
    expect(ago(2 * DAY)).toBe("2 days ago");
    expect(ago(6 * DAY + 23 * HOUR)).toBe("6 days ago");
  });

  it("switches to an absolute date at seven days", () => {
    expect(ago(7 * DAY)).toBe("30 Aug 2026");
    expect(formatPlayedAt("2025-12-31T09:00:00.000Z", now)).toBe("31 Dec 2025");
  });

  it("does not count backwards for a row stamped in the future", () => {
    expect(formatPlayedAt("2026-09-06T12:05:00.000Z", now)).toBe("just now");
  });

  it("says so rather than rendering NaN when the date cannot be read", () => {
    expect(formatPlayedAt("not a date", now)).toBe("unknown date");
  });
});

describe("formatMoveCount", () => {
  // move_count is stored in plies, so the number shown is half of it, rounded up.
  it("halves the ply count and rounds up", () => {
    expect(formatMoveCount(4)).toBe("2 moves");
    expect(formatMoveCount(5)).toBe("3 moves");
    expect(formatMoveCount(41)).toBe("21 moves");
  });

  it("says one move in the singular", () => {
    expect(formatMoveCount(1)).toBe("1 move");
    expect(formatMoveCount(2)).toBe("1 move");
  });
});
