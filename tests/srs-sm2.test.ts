import { describe, expect, it } from "vitest";

import { computeNextReview, MIN_EASE_FACTOR, type Quality, type Sm2State } from "@/lib/srs/sm2";

// The srs_state defaults: the state of a lesson that has just graduated.
const FRESH: Sm2State = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };
const NOW = new Date("2026-09-17T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function reviewAll(start: Sm2State, qualities: readonly Quality[]): Sm2State {
  return qualities.reduce<Sm2State>((state, quality) => {
    const { easeFactor, intervalDays, repetitions } = computeNextReview(state, quality, NOW);
    return { easeFactor, intervalDays, repetitions };
  }, start);
}

describe("computeNextReview on a fresh item", () => {
  it("perfect recall: one day, and the item gets easier", () => {
    const next = computeNextReview(FRESH, 5, NOW);
    expect(next).toEqual({
      easeFactor: 2.6,
      intervalDays: 1,
      repetitions: 1,
      nextReviewAt: new Date(NOW.getTime() + DAY_MS),
    });
  });

  it("correct with serious effort: still a pass, but the item gets harder", () => {
    const next = computeNextReview(FRESH, 3, NOW);
    expect(next).toMatchObject({ easeFactor: 2.36, intervalDays: 1, repetitions: 1 });
  });

  it("blackout: no progress, and a large ease penalty", () => {
    const next = computeNextReview(FRESH, 0, NOW);
    expect(next).toEqual({
      easeFactor: 1.7,
      intervalDays: 1,
      repetitions: 0,
      nextReviewAt: new Date(NOW.getTime() + DAY_MS),
    });
  });
});

describe("computeNextReview across reviews", () => {
  it("grows the interval 1, 6, then previous times ease", () => {
    // Quality 4 leaves the ease at 2.5, so the third interval is exactly 6 * 2.5.
    const first = computeNextReview(FRESH, 4, NOW);
    const second = computeNextReview(first, 4, NOW);
    const third = computeNextReview(second, 4, NOW);

    expect([first.intervalDays, second.intervalDays, third.intervalDays]).toEqual([1, 6, 15]);
    expect(third.repetitions).toBe(3);
    expect(third.nextReviewAt).toEqual(new Date(NOW.getTime() + 15 * DAY_MS));
  });

  it("scales the third interval by the ease from before that review", () => {
    // Ease is 2.7 going into the third review and 2.8 after it: 6 * 2.7 = 16.2.
    const third = reviewAll(FRESH, [5, 5, 5]);
    expect(third).toEqual({ easeFactor: 2.8, intervalDays: 16, repetitions: 3 });
  });

  it("keeps growing past the third review", () => {
    expect(reviewAll(FRESH, [4, 4, 4, 4]).intervalDays).toBe(38); // round(15 * 2.5)
  });

  it("resets repetitions and interval on a failure but keeps the ease history", () => {
    const beforeFailure = reviewAll(FRESH, [5, 5, 5]);
    const failed = computeNextReview(beforeFailure, 1, NOW);

    expect(failed).toMatchObject({ intervalDays: 1, repetitions: 0 });
    // 2.8 earned from three perfect reviews, minus 0.54 for quality 1. Not a
    // reset to 2.5.
    expect(failed.easeFactor).toBe(2.26);
  });

  it("restarts the 1, 6 ladder after a failure, then uses the lowered ease", () => {
    const relearned = reviewAll(FRESH, [5, 5, 5, 1, 4, 4, 4]);
    // Ease 2.26 after the failure; quality 4 leaves it there. round(6 * 2.26) = 14.
    expect(relearned).toEqual({ easeFactor: 2.26, intervalDays: 14, repetitions: 3 });
  });
});

describe("computeNextReview ease factor", () => {
  it("never falls below 1.3", () => {
    expect(reviewAll(FRESH, [0, 0, 0, 0]).easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it("clamps at the floor rather than overshooting it", () => {
    // 1.4 - 0.14 would be 1.26.
    const next = computeNextReview({ easeFactor: 1.4, intervalDays: 6, repetitions: 1 }, 3, NOW);
    expect(next.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it("recovers from the floor on good reviews", () => {
    const floored = reviewAll(FRESH, [0, 0, 0]);
    expect(computeNextReview(floored, 5, NOW).easeFactor).toBe(1.4);
  });

  it("does not accumulate float noise over many reviews", () => {
    // Unrounded, ten perfect reviews give 3.500000000000001.
    expect(reviewAll(FRESH, Array<Quality>(10).fill(5)).easeFactor).toBe(3.5);
  });

  it("still uses a floored ease to grow intervals", () => {
    const next = computeNextReview({ easeFactor: MIN_EASE_FACTOR, intervalDays: 6, repetitions: 2 }, 3, NOW);
    expect(next.intervalDays).toBe(8); // round(6 * 1.3) = round(7.8)
  });
});

it("does not change the state it was given", () => {
  const state = { ...FRESH };
  computeNextReview(state, 0, NOW);
  expect(state).toEqual(FRESH);
});
