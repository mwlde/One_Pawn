// What the Learn screens say about each track. Static copy, kept apart from
// the lessons themselves so a track can be shown before it has any.

import { TRACKS, type Track } from "./types";

export type TrackInfo = {
  title: string;
  description: string;
};

export const TRACK_INFO: Record<Track, TrackInfo> = {
  basics: {
    title: "Basics",
    description: "How the pieces move and the rules that decide a game.",
  },
  openings: {
    title: "Openings",
    description: "Principles and lines for the first moves of a game.",
  },
  tactics: {
    title: "Tactics",
    description: "Forks, pins and the patterns that win material.",
  },
  endgames: {
    title: "Endgames",
    description: "Converting an advantage when few pieces remain.",
  },
};

// Narrows a URL segment to a Track, so /learn/nonsense can 404 before anything
// is looked up with it.
export function isTrack(slug: string): slug is Track {
  return TRACKS.some((track) => track === slug);
}
