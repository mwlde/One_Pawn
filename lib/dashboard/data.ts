// Server-side reads for the dashboard. Each takes the user id the page has
// already resolved, so the auth check happens once on the page rather than
// again inside every reader. The review queue is read through the Reinforce
// reader in @/lib/srs/queue instead of here.

import {
  computeStats,
  GAME_SUMMARY_COLUMNS,
  type GameStats,
  type GameSummary,
} from "@/lib/game/history";
import { loadLesson, loadTrackLessons } from "@/lib/lessons/load";
import { TRACKS, type Track } from "@/lib/lessons/types";
import type { createClient } from "@/lib/supabase/server";

import { hasStartedAnyTrack, pickResumeTrack, type TrackCount } from "./learn-progress";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type ProgressRow = { lesson_id: string; completed_at: string };

export type LearnDashboard = {
  byTrack: Map<Track, TrackCount>;
  resumeTrack: Track | null;
  hasStarted: boolean;
  lessonsDone: number;
  lessonsTotal: number;
};

export type LearnDashboardRead =
  | { status: "known"; learn: LearnDashboard }
  | { status: "failed" };

export async function readLearnDashboard(
  supabase: ServerClient,
  userId: string,
): Promise<LearnDashboardRead> {
  // completed_at descending so the first row of each track is its latest, which
  // is the order the resume rule reads recency from.
  const { data, error } = await supabase
    .from("user_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .returns<ProgressRow[]>();

  if (error !== null) {
    console.error("[dashboard] user_progress query failed", error);
    return { status: "failed" };
  }

  const byTrack = new Map<Track, TrackCount>(
    TRACKS.map((track) => [track, { done: 0, total: loadTrackLessons(track).length }]),
  );

  const recentTracks: Track[] = [];
  for (const row of data) {
    // A row for a lesson the app no longer ships counts towards no track, the
    // same rule countCompleted uses on the Learn hub.
    const lesson = loadLesson(row.lesson_id);
    if (lesson === null) continue;
    const count = byTrack.get(lesson.track);
    if (count === undefined) continue;
    count.done += 1;
    if (!recentTracks.includes(lesson.track)) recentTracks.push(lesson.track);
  }

  let lessonsDone = 0;
  let lessonsTotal = 0;
  for (const count of byTrack.values()) {
    lessonsDone += count.done;
    lessonsTotal += count.total;
  }

  return {
    status: "known",
    learn: {
      byTrack,
      resumeTrack: pickResumeTrack(recentTracks, byTrack),
      hasStarted: hasStartedAnyTrack(byTrack),
      lessonsDone,
      lessonsTotal,
    },
  };
}

export type GamesDashboard = {
  recent: GameSummary[];
  totalCount: number;
  weekStats: GameStats;
};

export type GamesDashboardRead =
  | { status: "known"; games: GamesDashboard }
  | { status: "failed" };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Three reads, run together: the five most recent for the games card, this
// week's games for its stats, and an exact total count. The count is a head
// query so it stays accurate past the fifty a windowed fetch would cap at.
export async function readGamesDashboard(
  supabase: ServerClient,
  userId: string,
  now: Date,
): Promise<GamesDashboardRead> {
  const weekAgo = new Date(now.getTime() - WEEK_MS).toISOString();

  const [recentRes, weekRes, totalRes] = await Promise.all([
    supabase
      .from("games")
      .select(GAME_SUMMARY_COLUMNS)
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(5)
      .returns<GameSummary[]>(),
    supabase
      .from("games")
      .select(GAME_SUMMARY_COLUMNS)
      .eq("user_id", userId)
      .gte("played_at", weekAgo)
      .returns<GameSummary[]>(),
    supabase.from("games").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  if (recentRes.error !== null || weekRes.error !== null || totalRes.error !== null) {
    console.error("[dashboard] games query failed", {
      recent: recentRes.error,
      week: weekRes.error,
      total: totalRes.error,
    });
    return { status: "failed" };
  }

  return {
    status: "known",
    games: {
      recent: recentRes.data ?? [],
      totalCount: totalRes.count ?? 0,
      weekStats: computeStats(weekRes.data ?? []),
    },
  };
}
