import { describe, expect, it } from "vitest";

import { GRADES, readReviewed, readReviewErrorKind } from "@/lib/srs/review";
import { reviewSchema } from "@/lib/srs/review-schema";
import { computeNextReview } from "@/lib/srs/sm2";

describe("GRADES", () => {
  it("maps the three buttons onto SM-2 qualities", () => {
    expect(GRADES.map(({ label, quality }) => [label, quality])).toEqual([
      ["Forgot", 1],
      ["Struggled", 3],
      ["Easy", 5],
    ]);
  });

  it("makes Forgot a failed review and the other two passes", () => {
    const state = { easeFactor: 2.5, intervalDays: 6, repetitions: 2 };
    const [forgot, struggled, easy] = GRADES.map(({ quality }) => computeNextReview(state, quality));

    expect(forgot).toMatchObject({ repetitions: 0, intervalDays: 1 });
    expect(struggled).toMatchObject({ repetitions: 3, intervalDays: 15 });
    expect(easy).toMatchObject({ repetitions: 3, intervalDays: 15 });
    // Same interval this time; the ease they leave behind is what differs.
    expect(struggled.easeFactor).toBeLessThan(easy.easeFactor);
  });
});

describe("reviewSchema", () => {
  it("accepts every SM-2 quality for a lesson the app ships", () => {
    for (const quality of [0, 1, 2, 3, 4, 5]) {
      expect(reviewSchema.safeParse({ lesson_id: "pawn-movement", quality }).success).toBe(true);
    }
  });

  it("rejects qualities off the scale and unknown lessons", () => {
    for (const quality of [-1, 6, 2.5, "5", null]) {
      expect(reviewSchema.safeParse({ lesson_id: "pawn-movement", quality }).success).toBe(false);
    }
    expect(reviewSchema.safeParse({ lesson_id: "no-such-lesson", quality: 5 }).success).toBe(false);
  });

  it("strips fields the client has no say over", () => {
    const parsed = reviewSchema.safeParse({
      lesson_id: "pawn-movement",
      quality: 5,
      user_id: "someone-else",
      interval_days: 365,
    });
    expect(parsed.data).toEqual({ lesson_id: "pawn-movement", quality: 5 });
  });
});

describe("readReviewed", () => {
  it("reads the route's success body", () => {
    expect(readReviewed({ reviewed: true, next_review_at: "2026-09-18T12:00:00.000Z" })).toEqual({
      reviewed: true,
      nextReviewAt: "2026-09-18T12:00:00.000Z",
    });
  });

  it("is not a success for anything else", () => {
    expect(readReviewed({ reviewed: "true" }).reviewed).toBe(false);
    expect(readReviewed({ saved: true }).reviewed).toBe(false);
    expect(readReviewed(null).reviewed).toBe(false);
  });
});

describe("readReviewErrorKind", () => {
  it("passes through the kinds the route sends and falls back to save_failed", () => {
    expect(readReviewErrorKind({ error: "not_in_queue" })).toBe("not_in_queue");
    expect(readReviewErrorKind({ error: "not_authenticated" })).toBe("not_authenticated");
    expect(readReviewErrorKind({ error: "srs_state_missing" })).toBe("save_failed");
    expect(readReviewErrorKind(null)).toBe("save_failed");
  });
});
