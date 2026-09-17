// Reading the review queue for the Reinforce screens. The write side, one
// graded review, is app/api/reinforce/review/route.ts.

import { loadLesson } from "@/lib/lessons/load";
import type { Lesson } from "@/lib/lessons/types";
import type { createClient } from "@/lib/supabase/server";

export type SrsRow = {
  lesson_id: string;
  interval_days: number;
  next_review_at: string;
  last_reviewed_at: string | null;
};

export type QueueItem = {
  lesson: Lesson;
  intervalDays: number;
  lastReviewedAt: string | null;
};

export type Queue = {
  // Oldest due first.
  due: QueueItem[];
  upcomingCount: number;
  // The earliest next_review_at among rows not yet due. Null when every row is
  // due, or there are none.
  nextDueAt: string | null;
};

export type QueueRead =
  | { status: "known"; queue: Queue; total: number }
  | { status: "logged_out" }
  | { status: "failed" };

// Rows must arrive sorted by next_review_at ascending, which the query does.
// A row for a lesson the app no longer ships is dropped: there is nothing to
// play for it.
export function partitionQueue(rows: readonly SrsRow[], now: Date): Queue {
  const due: QueueItem[] = [];
  let upcomingCount = 0;
  let nextDueAt: string | null = null;

  for (const row of rows) {
    const lesson = loadLesson(row.lesson_id);
    if (lesson === null) continue;

    if (new Date(row.next_review_at).getTime() <= now.getTime()) {
      due.push({ lesson, intervalDays: row.interval_days, lastReviewedAt: row.last_reviewed_at });
    } else {
      upcomingCount += 1;
      nextDueAt ??= row.next_review_at;
    }
  }

  return { due, upcomingCount, nextDueAt };
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// One read of every row, split in code, rather than a "due" query and a second
// one for the empty states. The hub needs all three answers: what is due, whether
// anything has graduated at all, and when the next review falls.
export async function readReviewQueue(supabase: ServerClient, now: Date): Promise<QueueRead> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return { status: "logged_out" };

  // The user_id filter restates the select policy, as in readCompletions.
  const { data, error } = await supabase
    .from("srs_state")
    .select("lesson_id, interval_days, next_review_at, last_reviewed_at")
    .eq("user_id", user.id)
    .order("next_review_at", { ascending: true })
    // No generated database types, so the shape is asserted. Only
    // last_reviewed_at is nullable in the table.
    .returns<SrsRow[]>();

  if (error !== null) {
    console.error("[reinforce] srs_state query failed", error);
    return { status: "failed" };
  }

  const queue = partitionQueue(data, now);
  return { status: "known", queue, total: queue.due.length + queue.upcomingCount };
}
