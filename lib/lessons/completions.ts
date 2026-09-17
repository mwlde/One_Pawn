// Reading progress back for the Learn screens. The write side is ./progress.ts.
// Kept apart because this runs on the server and that runs in the player.

import type { createClient } from "@/lib/supabase/server";

import type { Lesson } from "./types";

// "completed_no_hints" is the graduated state Phase 3 SRS picks lessons up
// from. Derived from used_hints, never stored, per LessonCompletion.
export type LessonStatus = "not_started" | "completed" | "completed_no_hints";

export type CompletionRow = {
  lesson_id: string;
  used_hints: boolean;
};

// Lesson id to used_hints. A lesson with no entry has not been completed.
export type Completions = ReadonlyMap<string, boolean>;

export function toCompletions(rows: readonly CompletionRow[]): Completions {
  return new Map(rows.map((row) => [row.lesson_id, row.used_hints]));
}

export function lessonStatus(completions: Completions, lessonId: string): LessonStatus {
  const usedHints = completions.get(lessonId);
  if (usedHints === undefined) return "not_started";
  return usedHints ? "completed" : "completed_no_hints";
}

// Counted against the lessons the app ships, not the rows: a row for a lesson
// since removed would otherwise push a track past 100%.
export function countCompleted(completions: Completions, lessons: readonly Pick<Lesson, "id">[]): number {
  return lessons.filter((lesson) => completions.has(lesson.id)).length;
}

// Unknown means there is no progress to show: nobody is logged in, or the read
// failed. The screens then show lesson counts instead of "0 / 1", which would
// claim a fact about the user that is not known.
export type ProgressRead =
  | { status: "known"; completions: Completions }
  | { status: "logged_out" }
  | { status: "failed" };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function readCompletions(supabase: ServerClient): Promise<ProgressRead> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return { status: "logged_out" };

  // The user_id filter restates the select policy, as on the profile page, so
  // the query says what it returns without a trip to the migration.
  const { data, error } = await supabase
    .from("user_progress")
    .select("lesson_id, used_hints")
    .eq("user_id", user.id)
    // No generated database types, so the shape is asserted. Both columns are
    // not null in the table.
    .returns<CompletionRow[]>();

  if (error !== null) {
    console.error("[learn] user_progress query failed", error);
    return { status: "failed" };
  }

  return { status: "known", completions: toCompletions(data) };
}
