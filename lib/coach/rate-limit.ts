// The coach rate limit: how many fresh coach analyses one user may run in a
// rolling 24 hours. Coach analysis spends money (a Groq call per notable move,
// plus the summary), so during the alpha it is capped rather than left open.
//
// The count is read from coach_usage, one row per fresh generation. A cache hit
// spends nothing and writes no row, so reopening an already-commentated game
// never counts against the limit.
//
// The Supabase server type is imported for types only, so it is erased at build
// and nothing server-only reaches a client bundle: a client component can still
// import the limit constant and the reset formatter from here.

import type { createClient } from "@/lib/supabase/server";

// The alpha number. Do not raise without a decision to: the whole point of the
// cap is to keep the pre-alpha Groq spend bounded and predictable.
export const COACH_DAILY_LIMIT = 3;

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type CoachRateLimit = {
  allowed: boolean;
  used: number;
  limit: number;
  // When the oldest usage in the window ages out, freeing a slot. Null when
  // nothing has been used, since there is nothing to wait for.
  resetsAt: Date | null;
};

type UsageRow = { created_at: string };

// The server client. A test passes a stub of the one query chain used, cast to
// this type: typing the parameter structurally instead makes TypeScript compare
// a hand-written interface against Supabase's own deep generics, which it
// reports as an excessively deep instantiation.
export type CoachUsageClient = Awaited<ReturnType<typeof createClient>>;

// How many coach analyses this user has run in the last 24 hours, whether they
// may run another, and when a slot next frees up. Throws on a read failure
// rather than guessing a count: the caller turns that into a 500, so a broken
// read never reads as either a false limit or a free pass.
export async function checkCoachRateLimit(
  userId: string,
  supabase: CoachUsageClient,
  now: Date = new Date(),
): Promise<CoachRateLimit> {
  const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("coach_usage")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })
    .returns<UsageRow[]>();

  if (error !== null || data === null) {
    throw new Error("coach usage read failed");
  }

  const used = data.length;
  const oldest = data[0];
  const resetsAt =
    oldest === undefined ? null : new Date(new Date(oldest.created_at).getTime() + WINDOW_MS);

  return { allowed: used < COACH_DAILY_LIMIT, used, limit: COACH_DAILY_LIMIT, resetsAt };
}

// The reset time as a short, rounded phrase for the message shown when the limit
// is hit: "in about 5 hours", "in about 40 minutes". Rounded on purpose; the
// exact second is noise, and "about" keeps a rounded number honest.
export function formatResetIn(resetsAt: Date, now: Date = new Date()): string {
  const ms = resetsAt.getTime() - now.getTime();
  if (ms <= 0) return "shortly";

  const minutes = Math.round(ms / 60000);
  if (minutes < 60) {
    return minutes <= 1 ? "in about a minute" : `in about ${minutes} minutes`;
  }

  const hours = Math.round(minutes / 60);
  return hours <= 1 ? "in about an hour" : `in about ${hours} hours`;
}
