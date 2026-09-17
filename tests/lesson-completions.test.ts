import { describe, expect, it } from "vitest";

import { countCompleted, lessonStatus, toCompletions } from "@/lib/lessons/completions";
import { loadTrackLessons } from "@/lib/lessons/load";
import { isTrack } from "@/lib/lessons/tracks";

describe("lessonStatus", () => {
  const completions = toCompletions([
    { lesson_id: "with-hints", used_hints: true },
    { lesson_id: "no-hints", used_hints: false },
  ]);

  it("is not started without a row", () => {
    expect(lessonStatus(completions, "missing")).toBe("not_started");
  });

  it("is completed when the best run used hints", () => {
    expect(lessonStatus(completions, "with-hints")).toBe("completed");
  });

  it("is completed without hints when a run used none", () => {
    expect(lessonStatus(completions, "no-hints")).toBe("completed_no_hints");
  });
});

describe("countCompleted", () => {
  it("counts only lessons in the list it is given", () => {
    // A row for a lesson no longer shipped must not count towards a track.
    const completions = toCompletions([
      { lesson_id: "a", used_hints: true },
      { lesson_id: "removed", used_hints: false },
    ]);
    expect(countCompleted(completions, [{ id: "a" }, { id: "b" }])).toBe(1);
  });
});

describe("loadTrackLessons", () => {
  it("returns only the track's own lessons", () => {
    const basics = loadTrackLessons("basics");
    expect(basics.length).toBeGreaterThan(0);
    expect(basics.every((lesson) => lesson.track === "basics")).toBe(true);
  });

  it("orders lessons by their position in the track", () => {
    const orders = loadTrackLessons("basics").map((lesson) => lesson.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe("isTrack", () => {
  it("accepts the four track slugs and nothing else", () => {
    expect(["basics", "openings", "tactics", "endgames"].every(isTrack)).toBe(true);
    expect(isTrack("nonsense")).toBe(false);
    expect(isTrack("Basics")).toBe(false);
  });
});
