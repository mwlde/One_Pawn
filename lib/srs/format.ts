// How the Reinforce screens word SRS dates and counts. Kept apart from
// ./queue.ts, which loads lessons, so the review screen can import these
// without bringing zod into the browser.

import { formatPlayedAt } from "@/lib/game/history";

export function formatLastReviewed(lastReviewedAt: string | null, now: Date): string {
  return lastReviewedAt === null ? "not reviewed yet" : `reviewed ${formatPlayedAt(lastReviewedAt, now)}`;
}

export function formatInterval(intervalDays: number): string {
  return `interval ${intervalDays}d`;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Rounded up, so a review due in 90 minutes reads "in 2 hours" rather than
// promising it sooner than it is. The hour count is what gets compared: a
// one-day interval read back a moment after it was written is a few
// milliseconds short of a day, and should say "tomorrow", not "in 24 hours".
export function formatDueIn(dueAt: string, now: Date): string {
  const remaining = new Date(dueAt).getTime() - now.getTime();
  if (remaining <= HOUR) return "within the hour";
  const hours = Math.ceil(remaining / HOUR);
  if (hours < 24) return `in ${hours} hours`;
  const days = Math.ceil(remaining / DAY);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

export function formatDueCount(count: number): string {
  return `${count} ${count === 1 ? "lesson" : "lessons"} due`;
}
