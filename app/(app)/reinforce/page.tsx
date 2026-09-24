import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { loginPath } from "@/lib/auth/next-path";
import { TRACK_INFO } from "@/lib/lessons/tracks";
import { formatDueCount, formatDueIn, formatInterval, formatLastReviewed } from "@/lib/srs/format";
import { readReviewQueue, type QueueItem } from "@/lib/srs/queue";
import { createClient } from "@/lib/supabase/server";

import { RefreshOnFocus } from "./RefreshOnFocus";

export const metadata: Metadata = {
  title: "Reinforce · One Pawn",
};

const NOTE = "text-xs text-graphite";

// Wireframe 08e's shell: mono label, headline, one sentence, one way forward.
// The same shell serves every state with nothing to review, as 08e's notes ask.
function EmptyState({
  label,
  headline,
  children,
}: {
  label: string;
  headline: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 md:px-12">
      <div className="w-full max-w-[560px] text-center">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">{label}</div>
        <h1 className="mb-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">{headline}</h1>
        {children}
      </div>
    </div>
  );
}

// A row of the dashboard's Reinforce queue card, with the track and the SM-2
// state the brief asks for in place of "due today".
function QueueRow({ item, now }: { item: QueueItem; now: Date }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded border border-rule bg-surface px-3 py-3 md:px-4">
      <div className="min-w-0">
        <div className="text-sm font-medium md:text-sm">{item.lesson.title}</div>
        <div className="mt-1 text-xs text-graphite">
          {TRACK_INFO[item.lesson.track].title} · {formatLastReviewed(item.lastReviewedAt, now)}
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-graphite">{formatInterval(item.intervalDays)}</span>
    </li>
  );
}

export default function ReinforcePage() {
  return (
    <>
      <RefreshOnFocus />
      <ReinforceHub />
    </>
  );
}

// Open to logged-out visitors, like Learn. The queue area says why it is empty
// rather than sending them away.
async function ReinforceHub() {
  const supabase = await createClient();
  // Taken once, so every date on the page is measured from the same instant.
  // Rendered on the server for the same reason as the profile page's dates.
  const now = new Date();
  const read = await readReviewQueue(supabase, now);

  if (read.status === "logged_out") {
    return (
      <EmptyState label="REINFORCE" headline="Log in to see your review queue.">
        <p className="mb-8 text-sm leading-relaxed text-graphite">
          Lessons you finish without hints come back here for review, spaced further apart each
          time you remember them.
        </p>
        <Link href={loginPath("/reinforce")} className={buttonClasses("primary")}>
          Log in
        </Link>
      </EmptyState>
    );
  }

  if (read.status === "failed") {
    return (
      <EmptyState label="REINFORCE" headline="Your review queue could not be loaded.">
        <p className="text-sm leading-relaxed text-graphite">Refresh the page to try again.</p>
      </EmptyState>
    );
  }

  const { queue, total } = read;

  if (total === 0) {
    return (
      <EmptyState label="NOTHING TO REVIEW YET" headline="Your review queue is empty.">
        <p className="mb-8 text-sm leading-relaxed text-graphite">
          Finish a lesson in Learn without hints to add it to the queue.
        </p>
        <Link href="/learn" className={buttonClasses("primary")}>
          Open Learn
        </Link>
      </EmptyState>
    );
  }

  if (queue.due.length === 0) {
    return (
      <EmptyState label="ALL CAUGHT UP" headline="Nothing is due.">
        <p className="mb-8 text-sm leading-relaxed text-graphite">
          {queue.nextDueAt === null
            ? "Nothing is scheduled yet."
            : `Next review ${formatDueIn(queue.nextDueAt, now)}.`}
        </p>
        <p className={NOTE}>
          or{" "}
          <Link href="/learn" className="text-info-text underline underline-offset-2 transition-colors hover:text-ink">
            browse all tracks
          </Link>
        </p>
      </EmptyState>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col items-center gap-1 border-b border-rule px-4 py-6 text-center md:px-8 md:py-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">Reinforce</div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">
          {formatDueCount(queue.due.length)}
        </h1>
        {queue.upcomingCount > 0 ? (
          <div className={NOTE}>{queue.upcomingCount} upcoming</div>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6 md:px-8">
        <ul className="flex flex-col gap-2">
          {queue.due.map((item) => (
            <QueueRow key={item.lesson.id} item={item} now={now} />
          ))}
        </ul>
        <Link href="/reinforce/review" className={buttonClasses("primary")}>
          Start review ({queue.due.length})
        </Link>
      </div>
    </div>
  );
}
