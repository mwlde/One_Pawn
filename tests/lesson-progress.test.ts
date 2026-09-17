import { describe, expect, it } from "vitest";

import { loadLesson } from "@/lib/lessons/load";
import {
  buildProgressPayload,
  finishAction,
  readGraduationStatus,
  readProgressErrorKind,
  readSaved,
} from "@/lib/lessons/progress";
import { saveProgressSchema } from "@/lib/lessons/progress-schema";

const lesson = loadLesson("pawn-movement");
if (lesson === null) throw new Error("pawn-movement lesson is missing");

describe("buildProgressPayload", () => {
  it("reads the run as the columns store it", () => {
    const wrongMoves = ["single-push:e2e5", "single-push:e2d3"];
    expect(buildProgressPayload(lesson, { mistakes: 2, usedHints: true, wrongMoves })).toEqual({
      lesson_id: "pawn-movement",
      used_hints: true,
      mistake_count: 2,
      wrong_moves: ["single-push:e2e5", "single-push:e2d3"],
    });
  });

  it("never carries an owner or a timestamp", () => {
    // Both are the server's to set. A payload that had them would be trusting
    // the client with who and when.
    const payload = buildProgressPayload(lesson, { mistakes: 0, usedHints: false, wrongMoves: [] });
    expect(payload).not.toHaveProperty("user_id");
    expect(payload).not.toHaveProperty("completed_at");
  });

  it("does not follow the run after the lesson it was built from", () => {
    // The retry-after-Restart case: the payload holds values, not the run.
    const run = { mistakes: 1, usedHints: false, wrongMoves: ["single-push:e2e5"] };
    const payload = buildProgressPayload(lesson, run);

    run.mistakes = 0;
    run.usedHints = true;
    run.wrongMoves.push("double-push:d2d5");

    expect(payload).toMatchObject({ mistake_count: 1, used_hints: false, wrong_moves: ["single-push:e2e5"] });
  });
});

describe("finishAction", () => {
  it("reports a review run to the review screen instead of saving it", () => {
    // Logged in or not: a review is graded against srs_state, never written to
    // user_progress as another completion.
    expect(finishAction("review", true)).toBe("report");
    expect(finishAction("review", false)).toBe("report");
  });

  it("saves a Learn run when there is someone to save it for", () => {
    expect(finishAction("learn", true)).toBe("save");
    expect(finishAction("learn", false)).toBe("none");
  });
});

describe("readSaved", () => {
  it("is true only for the route's success body", () => {
    expect(readSaved({ saved: true })).toBe(true);
    expect(readSaved({ saved: "true" })).toBe(false);
    expect(readSaved({})).toBe(false);
    expect(readSaved(null)).toBe(false);
  });
});

describe("readGraduationStatus", () => {
  it("passes through the statuses the route sends", () => {
    expect(readGraduationStatus({ saved: true, graduation_status: "graduated_now" })).toBe("graduated_now");
    expect(readGraduationStatus({ saved: true, graduation_status: "not_graduated" })).toBe("not_graduated");
    expect(readGraduationStatus({ saved: true, graduation_status: "already_graduated" })).toBe("already_graduated");
  });

  it("is null for anything else, including a route that could not say", () => {
    expect(readGraduationStatus({ saved: true, graduation_status: null })).toBeNull();
    expect(readGraduationStatus({ saved: true, graduation_status: "graduated" })).toBeNull();
    expect(readGraduationStatus({ saved: true })).toBeNull();
    expect(readGraduationStatus(null)).toBeNull();
  });
});

describe("readProgressErrorKind", () => {
  it("passes through the kinds the route sends", () => {
    expect(readProgressErrorKind({ error: "not_authenticated" })).toBe("not_authenticated");
    expect(readProgressErrorKind({ error: "email_not_verified" })).toBe("email_not_verified");
    expect(readProgressErrorKind({ error: "invalid_progress_data" })).toBe("invalid_progress_data");
  });

  it("falls back to save_failed for anything it does not recognise", () => {
    expect(readProgressErrorKind({ error: "user_progress_table_missing" })).toBe("save_failed");
    expect(readProgressErrorKind({ error: 7 })).toBe("save_failed");
    expect(readProgressErrorKind(null)).toBe("save_failed");
  });
});

describe("saveProgressSchema", () => {
  const valid = { lesson_id: "pawn-movement", used_hints: false, mistake_count: 0 };

  it("accepts what buildProgressPayload produces", () => {
    const payload = buildProgressPayload(lesson, {
      mistakes: 2,
      usedHints: true,
      wrongMoves: ["single-push:e2e5", "single-push:e2d3"],
    });
    expect(saveProgressSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects a lesson the app does not ship", () => {
    for (const lesson_id of ["", "knight-movement", "Pawn-Movement", "pawn-movement ", "a".repeat(101)]) {
      expect(saveProgressSchema.safeParse({ ...valid, lesson_id }).success).toBe(false);
    }
  });

  it("rejects a mistake count that is not a sane count", () => {
    for (const mistake_count of [-1, 1.5, 1001, "3"]) {
      expect(saveProgressSchema.safeParse({ ...valid, mistake_count }).success).toBe(false);
    }
    expect(saveProgressSchema.safeParse({ ...valid, mistake_count: 1000 }).success).toBe(true);
  });

  it("accepts a payload without wrong_moves, from a client that predates it", () => {
    expect(saveProgressSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects wrong_moves that is not a bounded list of strings", () => {
    for (const wrong_moves of [null, "single-push:e2e5", [""], [7], ["a".repeat(201)], Array(1001).fill("x:e2e4")]) {
      expect(saveProgressSchema.safeParse({ ...valid, wrong_moves }).success).toBe(false);
    }
    expect(saveProgressSchema.safeParse({ ...valid, wrong_moves: [] }).success).toBe(true);
  });

  it("rejects used_hints that is not a boolean", () => {
    for (const used_hints of ["false", 0, null, undefined]) {
      expect(saveProgressSchema.safeParse({ ...valid, used_hints }).success).toBe(false);
    }
  });

  it("strips an owner or timestamp the client tries to choose", () => {
    const parsed = saveProgressSchema.safeParse({
      ...valid,
      user_id: "someone-else",
      completed_at: "2000-01-01T00:00:00Z",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("user_id");
    expect(parsed.data).not.toHaveProperty("completed_at");
  });

  it("rejects a missing body", () => {
    expect(saveProgressSchema.safeParse({}).success).toBe(false);
    expect(saveProgressSchema.safeParse(null).success).toBe(false);
  });
});
