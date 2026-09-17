import { describe, expect, it } from "vitest";

import { formatDueCount, formatDueIn, formatInterval, formatLastReviewed } from "@/lib/srs/format";
import { partitionQueue, type SrsRow } from "@/lib/srs/queue";

const NOW = new Date("2026-09-17T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function row(lessonId: string, offsetMs: number, overrides: Partial<SrsRow> = {}): SrsRow {
  return {
    lesson_id: lessonId,
    interval_days: 1,
    next_review_at: new Date(NOW.getTime() + offsetMs).toISOString(),
    last_reviewed_at: null,
    ...overrides,
  };
}

describe("partitionQueue", () => {
  it("splits due from upcoming, keeping the query's oldest-first order", () => {
    const queue = partitionQueue(
      [row("knight-fork", -2 * DAY), row("pawn-movement", -HOUR), row("opposition", 3 * HOUR), row("italian-game", DAY)],
      NOW,
    );

    expect(queue.due.map((item) => item.lesson.id)).toEqual(["knight-fork", "pawn-movement"]);
    expect(queue.upcomingCount).toBe(2);
    expect(queue.nextDueAt).toBe(new Date(NOW.getTime() + 3 * HOUR).toISOString());
  });

  it("counts a review due this exact instant as due", () => {
    expect(partitionQueue([row("pawn-movement", 0)], NOW).due).toHaveLength(1);
  });

  it("carries the SM-2 state the hub shows", () => {
    const [item] = partitionQueue(
      [row("pawn-movement", -DAY, { interval_days: 6, last_reviewed_at: "2026-09-11T12:00:00Z" })],
      NOW,
    ).due;
    expect(item).toMatchObject({ intervalDays: 6, lastReviewedAt: "2026-09-11T12:00:00Z" });
    expect(item.lesson.title.length).toBeGreaterThan(0);
  });

  it("drops rows for lessons the app no longer ships", () => {
    const queue = partitionQueue([row("retired-lesson", -DAY), row("gone-too", DAY)], NOW);
    expect(queue).toEqual({ due: [], upcomingCount: 0, nextDueAt: null });
  });

  it("is empty for no rows", () => {
    expect(partitionQueue([], NOW)).toEqual({ due: [], upcomingCount: 0, nextDueAt: null });
  });
});

describe("formatDueIn", () => {
  const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

  it("rounds up, so a review is never promised sooner than it is", () => {
    expect(formatDueIn(at(20 * 60 * 1000), NOW)).toBe("within the hour");
    expect(formatDueIn(at(HOUR), NOW)).toBe("within the hour");
    expect(formatDueIn(at(90 * 60 * 1000), NOW)).toBe("in 2 hours");
    expect(formatDueIn(at(DAY), NOW)).toBe("in 1 day");
    expect(formatDueIn(at(DAY + HOUR), NOW)).toBe("in 2 days");
    expect(formatDueIn(at(6 * DAY), NOW)).toBe("in 6 days");
  });

  it("reads a date already past as within the hour rather than a negative count", () => {
    expect(formatDueIn(at(-HOUR), NOW)).toBe("within the hour");
  });
});

describe("hub labels", () => {
  it("says when a lesson has never been reviewed", () => {
    expect(formatLastReviewed(null, NOW)).toBe("not reviewed yet");
    expect(formatLastReviewed("2026-09-14T12:00:00Z", NOW)).toBe("reviewed 3 days ago");
  });

  it("formats the interval and the due count", () => {
    expect(formatInterval(6)).toBe("interval 6d");
    expect(formatDueCount(1)).toBe("1 lesson due");
    expect(formatDueCount(3)).toBe("3 lessons due");
  });
});
