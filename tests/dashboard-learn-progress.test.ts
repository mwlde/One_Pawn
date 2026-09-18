import { describe, expect, it } from "vitest";

import { hasStartedAnyTrack, pickResumeTrack, type TrackCount } from "@/lib/dashboard/learn-progress";
import type { Track } from "@/lib/lessons/types";

function counts(entries: Partial<Record<Track, TrackCount>>): Map<Track, TrackCount> {
  return new Map(Object.entries(entries) as [Track, TrackCount][]);
}

describe("pickResumeTrack", () => {
  it("returns the most recent track that is started but not finished", () => {
    const byTrack = counts({
      openings: { done: 1, total: 3 },
      tactics: { done: 2, total: 4 },
    });
    // tactics is more recent, and both are mid-track, so tactics wins.
    expect(pickResumeTrack(["tactics", "openings"], byTrack)).toBe("tactics");
  });

  it("skips a track played to the end and resumes an older unfinished one", () => {
    const byTrack = counts({
      basics: { done: 1, total: 1 },
      openings: { done: 1, total: 3 },
    });
    expect(pickResumeTrack(["basics", "openings"], byTrack)).toBe("openings");
  });

  it("is null when every started track is finished", () => {
    const byTrack = counts({ basics: { done: 1, total: 1 } });
    expect(pickResumeTrack(["basics"], byTrack)).toBeNull();
  });

  it("is null when nothing has been started", () => {
    const byTrack = counts({ basics: { done: 0, total: 1 } });
    expect(pickResumeTrack([], byTrack)).toBeNull();
  });
});

describe("hasStartedAnyTrack", () => {
  it("is true when any track has a completed lesson", () => {
    expect(hasStartedAnyTrack(counts({ tactics: { done: 1, total: 4 } }))).toBe(true);
  });

  it("is false when no track has been touched", () => {
    expect(
      hasStartedAnyTrack(counts({ basics: { done: 0, total: 1 }, tactics: { done: 0, total: 4 } })),
    ).toBe(false);
  });
});
