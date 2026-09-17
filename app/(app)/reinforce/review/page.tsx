import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { formatInterval, formatLastReviewed } from "@/lib/srs/format";
import { readReviewQueue } from "@/lib/srs/queue";
import { createClient } from "@/lib/supabase/server";

import { ReviewSession, type ReviewItem } from "./ReviewSession";

export const metadata: Metadata = {
  title: "Review · One Pawn",
};

// The queue is read once, here, and fixed for the session. A graded lesson is
// pushed at least a day out, so a reload rebuilds the queue from what is still
// due and picks up where the user left off. Nothing needs to live in the URL.
export default async function ReviewPage() {
  const supabase = await createClient();
  const now = new Date();
  const read = await readReviewQueue(supabase, now);

  // The hub explains every one of these states, so it is where they are sent.
  if (read.status !== "known" || read.queue.due.length === 0) redirect("/reinforce");

  // Formatted on the server, as on the hub, so hydration cannot disagree about
  // "3 days ago". Lessons are loaded and validated here too, keeping zod out of
  // the browser.
  const items: ReviewItem[] = read.queue.due.map((item) => ({
    lesson: item.lesson,
    context: `${formatLastReviewed(item.lastReviewedAt, now)} · ${formatInterval(item.intervalDays)}`,
  }));

  return <ReviewSession items={items} upcomingNextDueAt={read.queue.nextDueAt} />;
}
