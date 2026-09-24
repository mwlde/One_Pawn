"use client";

import Link from "next/link";

import { formatResetIn } from "@/lib/coach/rate-limit";

// The message shown when the day's coach analyses are used up. Shared by the
// post-game screen and the profile coach panel so the copy and the reset-time
// wording stay in one place. The tone is deliberately light: the limit is an
// alpha guardrail, not a punishment, and the caller adds a line pointing at
// whatever is still unlimited from where the reader is standing.

type RateLimitLike = { used: number; limit: number; resetsAt: Date | null };

export function RateLimitNotice({
  rateLimit,
  extra,
  className = "",
}: {
  rateLimit: RateLimitLike;
  // A context line, e.g. "Rematch or start a new game instead; those stay
  // unlimited." Left off where there is nothing else to point at.
  extra?: string;
  className?: string;
}) {
  const analyses = rateLimit.limit === 1 ? "analysis" : "analyses";
  const reset = rateLimit.resetsAt === null ? "within a day" : formatResetIn(rateLimit.resetsAt);

  return (
    <div className={className}>
      <p className="text-xs leading-relaxed">
        You&apos;ve used your {rateLimit.limit} coach {analyses} today. Next reset: {reset}.
        {extra === undefined ? null : ` ${extra}`}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-graphite">
        The coach runs on paid compute, so it&apos;s capped while One Pawn is in alpha.{" "}
        <Link href="/about" className="text-info-text underline underline-offset-2 transition-colors hover:text-ink">
          More about One Pawn
        </Link>
      </p>
    </div>
  );
}
