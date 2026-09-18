import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { loginPath } from "@/lib/auth/next-path";
import { TRACK_INFO } from "@/lib/lessons/tracks";
import { formatDueCount, formatDueIn, formatInterval, formatLastReviewed } from "@/lib/srs/format";
import { readReviewQueue, type QueueItem } from "@/lib/srs/queue";
import { createClient } from "@/lib/supabase/server";

import { RefreshOnFocus } from "./RefreshOnFocus";

export const metadata: Metadata = {
  title: "Reinforce · One Pawn",
};

const PRIMARY_LINK =
  "inline-block border border-ink bg-ink px-5 py-3.5 text-center text-sm font-semibold leading-none text-panel transition-colors hover:bg-black";
const MONO_NOTE = "font-mono text-[11px] text-muted";

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
        <div className="mb-3 font-mono text-[10px] tracking-[0.1em] text-muted">{label}</div>
        <h1 className="mb-3 text-2xl font-semibold tracking-[-0.01em] md:text-3xl">{headline}</h1>
        {children}
      </div>
    </div>
  );
}

// A row of the dashboard's Reinforce queue card, with the track and the SM-2
// state the brief asks for in place of "due today".
function QueueRow({ item, now }: { item: QueueItem; now: Date }) {
  return (
    <li className="flex items-center justify-between gap-3 border border-ink px-3 py-2.5 md:px-4 md:py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold md:text-sm">{item.lesson.title}</div>
        <div className="mt-0.5 font-mono text-[10px] text-muted">
          {TRACK_INFO[item.lesson.track].title} · {formatLastReviewed(item.lastReviewedAt, now)}
        </div>
      </div>
      <span className="shrink-0 font-mono text-[10px] text-muted">{formatInterval(item.intervalDays)}</span>
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
        <p className="mb-7 text-sm leading-relaxed text-muted">
          Lessons you finish without hints come back here for review, spaced further apart each
          time you remember them.
        </p>
        <Link href={loginPath("/reinforce")} className={PRIMARY_LINK}>
          Log in →
        </Link>
      </EmptyState>
    );
  }

  if (read.status === "failed") {
    return (
      <EmptyState label="REINFORCE" headline="Your review queue could not be loaded.">
        <p className="text-sm leading-relaxed text-muted">Refresh the page to try again.</p>
      </EmptyState>
    );
  }

  const { queue, total } = read;

  if (total === 0) {
    return (
      <EmptyState label="NOTHING TO REVIEW YET" headline="Your review queue is empty.">
        <p className="mb-7 text-sm leading-relaxed text-muted">
          Finish a lesson in Learn without hints to add it to the queue.
        </p>
        <Link href="/learn" className={PRIMARY_LINK}>
          Open Learn →
        </Link>
      </EmptyState>
    );
  }

  if (queue.due.length === 0) {
    return (
      <EmptyState label="ALL CAUGHT UP" headline="Nothing is due.">
        <p className="mb-7 text-sm leading-relaxed text-muted">
          {queue.nextDueAt === null
            ? "Nothing is scheduled yet."
            : `Next review ${formatDueIn(queue.nextDueAt, now)}.`}
        </p>
        <p className={MONO_NOTE}>
          or{" "}
          <Link href="/learn" className="underline underline-offset-2 hover:text-ink">
            browse all tracks
          </Link>
        </p>
      </EmptyState>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col items-center gap-1 border-b border-dashed border-hairline px-4 py-6 text-center md:px-10 md:py-8">
        <div className="font-mono text-[10px] tracking-[0.14em] text-muted">REINFORCE</div>
        <h1 className="text-2xl font-semibold tracking-[-0.01em] md:text-3xl">
          {formatDueCount(queue.due.length)}
        </h1>
        {queue.upcomingCount > 0 ? (
          <div className={MONO_NOTE}>{queue.upcomingCount} upcoming</div>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6 md:px-10">
        <ul className="flex flex-col gap-1.5">
          {queue.due.map((item) => (
            <QueueRow key={item.lesson.id} item={item} now={now} />
          ))}
        </ul>
        <Link href="/reinforce/review" className={PRIMARY_LINK}>
          Start review ({queue.due.length}) →
        </Link>
      </div>
    </div>
  );
}
