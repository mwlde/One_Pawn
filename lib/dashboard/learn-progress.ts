// Pure helpers for the dashboard's Learn cards. The server reader in ./data.ts
// turns progress rows into these shapes; the resume rule lives here on its own
// so it can be tested without a database or the lesson loader.

import type { Track } from "@/lib/lessons/types";

export type TrackCount = {
  done: number;
  total: number;
};

// The most recently touched track that is started but not finished, or null
// when nothing is mid-track. `recentTracks` arrives most-recent first and
// already deduped. A track is resumable only while it has lessons left, so a
// track played to the end is skipped and an older unfinished one wins.
export function pickResumeTrack(
  recentTracks: readonly Track[],
  byTrack: ReadonlyMap<Track, TrackCount>,
): Track | null {
  for (const track of recentTracks) {
    const count = byTrack.get(track);
    if (count !== undefined && count.done > 0 && count.done < count.total) {
      return track;
    }
  }
  return null;
}

// Whether any track has at least one completed lesson. Separates "up to date on
// lessons" from "has never started", so the Continue card can word an empty
// resume as browsing rather than starting from nothing.
export function hasStartedAnyTrack(byTrack: ReadonlyMap<Track, TrackCount>): boolean {
  for (const count of byTrack.values()) {
    if (count.done > 0) return true;
  }
  return false;
}
