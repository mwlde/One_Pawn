import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ProgressBar } from "@/app/(app)/learn/ProgressBar";
import { buttonClasses } from "@/components/ui/Button";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";
import { loginPath } from "@/lib/auth/next-path";
import {
  describeOpponent,
  formatPlayedAt,
  resultLabel,
  type GameStats,
  type GameSummary,
} from "@/lib/game/history";
import { TRACK_INFO } from "@/lib/lessons/tracks";
import { TRACKS } from "@/lib/lessons/types";
import { formatDueCount, formatDueIn } from "@/lib/srs/format";
import { readReviewQueue, type QueueRead } from "@/lib/srs/queue";
import { createClient } from "@/lib/supabase/server";

import { readGamesDashboard, readLearnDashboard } from "@/lib/dashboard/data";
import type { GamesDashboardRead, LearnDashboardRead } from "@/lib/dashboard/data";

export const metadata: Metadata = {
  title: "Dashboard · One Pawn",
};

const NOTE = "text-xs text-graphite";

// No h-full: the utility cards size to their content so Reinforce can shrink to
// nothing on a quiet day. A card that should fill its slot is wrapped in a
// flex-1 cell instead.
const CARD = "flex min-h-0 flex-col gap-3 rounded border border-rule bg-surface p-4 md:p-6";

// Fixed tables rather than toLocaleDateString, for the reason history.ts gives:
// the short month name shifts between ICU builds, so the label would read
// differently depending on the runtime.
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

function dateLabel(now: Date): string {
  return `${WEEKDAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

function CardHeading({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-display text-xl font-medium">{title}</h2>
      {note !== undefined ? <span className={NOTE}>{note}</span> : null}
    </div>
  );
}

function LoadFailedCard({ title }: { title: string }) {
  return (
    <div className={CARD}>
      <CardHeading title={title} />
      <p className="text-xs leading-relaxed text-graphite">
        This could not be loaded. Refresh the page to try again.
      </p>
    </div>
  );
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-graphite">{label}</div>
      <div className="mt-1 font-mono text-xl font-medium leading-none tabular-nums">
        {value}
        {sub !== undefined ? (
          <span className="ml-2 text-xs font-normal text-graphite">{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

function weekRecord(stats: GameStats): string {
  // A resignation is a loss that did not happen on the board, so it counts as
  // one here rather than as its own figure.
  return `${stats.wins}W ${stats.draws}D ${stats.losses + stats.resigned}L`;
}

// The wireframe's rating, puzzle rating, accuracy and streak columns are
// dropped: there is no rating system, accuracy waits for Phase 4 analysis, and
// streaks are ruled out by the "focused, not gamified" commitment in PRODUCT.md.
function HeaderStats({
  games,
  learn,
}: {
  games: GamesDashboardRead;
  learn: LearnDashboardRead;
}) {
  const cells: ReactNode[] = [];

  if (games.status === "known") {
    cells.push(
      <StatCell key="games" label="Games" value={String(games.games.totalCount)} />,
      <StatCell
        key="week"
        label="This week"
        value={String(games.games.weekStats.played)}
        sub={games.games.weekStats.played > 0 ? weekRecord(games.games.weekStats) : undefined}
      />,
    );
  }

  if (learn.status === "known") {
    cells.push(
      <StatCell
        key="lessons"
        label="Lessons"
        value={`${learn.learn.lessonsDone} / ${learn.learn.lessonsTotal}`}
      />,
    );
  }

  if (cells.length === 0) return null;

  return <div className="flex gap-6 md:gap-8">{cells}</div>;
}

// The accent goes to Start review when something is due, so it only takes the
// primary action on a day with nothing to review.
function PlayCard({ primary }: { primary: boolean }) {
  return (
    <div className={CARD}>
      <CardHeading title="Play a game" note="Against the computer" />
      <p className="text-sm leading-relaxed text-graphite">
        Pick a side, a difficulty and a time control, then play the engine.
      </p>
      <Link href="/play" className={buttonClasses(primary ? "primary" : "secondary")}>
        Start a game
      </Link>
    </div>
  );
}

// Learn progress and the resume shortcut in one card: the four tracks with
// their bars, and a primary action that continues the most recent unfinished
// track. When nothing is mid-track it offers to browse or start instead, never
// a fabricated lesson to resume.
function LearnCard({ read }: { read: LearnDashboardRead }) {
  if (read.status === "failed") return <LoadFailedCard title="Learn" />;

  const { byTrack, resumeTrack, hasStarted } = read.learn;

  const cta =
    resumeTrack !== null
      ? { href: `/learn/${resumeTrack}`, label: `Resume ${TRACK_INFO[resumeTrack].title}` }
      : hasStarted
        ? { href: "/learn", label: "Browse tracks" }
        : { href: "/learn", label: "Start learning" };

  return (
    <div className={CARD}>
      <CardHeading title="Learn" />
      <ul className="flex flex-col gap-3">
        {TRACKS.map((track) => {
          const count = byTrack.get(track) ?? { done: 0, total: 0 };
          const empty = count.total === 0;
          return (
            <li key={track}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{TRACK_INFO[track].title}</span>
                <span className={`text-xs text-graphite ${empty ? "" : "font-mono tabular-nums"}`}>
                  {empty ? "Coming soon" : `${count.done} / ${count.total}`}
                </span>
              </div>
              {!empty ? (
                <div className="mt-2">
                  <ProgressBar done={count.done} total={count.total} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Link href={cta.href} className={buttonClasses("secondary")}>
        {cta.label}
      </Link>
    </div>
  );
}

function ReinforceCard({ read, now }: { read: QueueRead; now: Date }) {
  if (read.status !== "known") return <LoadFailedCard title="Reinforce" />;

  const { queue, total } = read;

  if (total === 0) {
    return (
      <div className={CARD}>
        <CardHeading title="Reinforce" />
        <p className="text-sm leading-relaxed text-graphite">
          Finish a lesson in Learn without hints to add it to your review queue.
        </p>
        <Link href="/learn" className={buttonClasses("secondary")}>
          Open Learn
        </Link>
      </div>
    );
  }

  if (queue.due.length === 0) {
    return (
      <div className={CARD}>
        <CardHeading title="Reinforce" note="All caught up" />
        <p className="text-sm leading-relaxed text-graphite">
          {queue.nextDueAt === null
            ? "Nothing is scheduled yet."
            : `Nothing is due. Next review ${formatDueIn(queue.nextDueAt, now)}.`}
        </p>
        <Link href="/reinforce" className={buttonClasses("secondary")}>
          Open Reinforce
        </Link>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <CardHeading
        title="Reinforce"
        note={queue.upcomingCount > 0 ? `${queue.upcomingCount} upcoming` : undefined}
      />
      <div className="self-start rounded-sm bg-pending px-2 py-1 text-sm font-medium text-on-pending">
        {formatDueCount(queue.due.length)}
      </div>
      <ul className="flex flex-col gap-2">
        {queue.due.slice(0, 3).map((item) => (
          <li
            key={item.lesson.id}
            className="flex items-center justify-between gap-3 rounded border border-rule px-3 py-2"
          >
            <span className="min-w-0 truncate text-sm font-medium">{item.lesson.title}</span>
            <span className="shrink-0 text-xs text-graphite">
              {TRACK_INFO[item.lesson.track].title}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/reinforce/review" className={buttonClasses("primary")}>
        Start review ({queue.due.length})
      </Link>
    </div>
  );
}

function GameRow({ game, now }: { game: GameSummary; now: Date }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-rule py-2 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-sm font-medium">{resultLabel(game.result, game.user_color)}</span>
        <span className="truncate text-xs text-graphite">
          {describeOpponent(game.difficulty)}
        </span>
        {game.mode === "coach" ? (
          <span
            title="Played in coach mode"
            className="shrink-0 rounded-sm border border-rule px-1 text-xs text-graphite"
          >
            Coach
          </span>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-graphite">
        {formatPlayedAt(game.played_at, now)}
      </span>
    </li>
  );
}

function RecentGamesCard({ read, now }: { read: GamesDashboardRead; now: Date }) {
  if (read.status === "failed") return <LoadFailedCard title="Recent games" />;

  const { recent, totalCount } = read.games;

  if (totalCount === 0) {
    return (
      <div className={CARD}>
        <CardHeading title="Recent games" />
        <p className="text-sm leading-relaxed text-graphite">
          You have not played a game yet. Your last games will show up here.
        </p>
        <Link href="/play" className={buttonClasses("secondary")}>
          Play your first game
        </Link>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <CardHeading
        title="Recent games"
        note={
          <Link href="/profile" className="text-info-text transition-colors hover:text-ink">
            All games
          </Link>
        }
      />
      <ul className="flex flex-col">
        {recent.map((game) => (
          <GameRow key={game.id} game={game} now={now} />
        ))}
      </ul>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) redirect(loginPath("/dashboard"));

  // One instant for every date on the page, rendered on the server so a
  // relative time does not disagree with the one hydration would compute.
  const now = new Date();

  const [reviewRead, learnRead, gamesRead] = await Promise.all([
    readReviewQueue(supabase, now),
    readLearnDashboard(supabase, user.id),
    readGamesDashboard(supabase, user.id, now),
  ]);

  const reviewDue = reviewRead.status === "known" && reviewRead.queue.due.length > 0;

  return (
    // Fills the shell's main area and clips rather than scrolls on md+, so the
    // dashboard reads as one screen. Mobile stacks and scrolls: everything here
    // cannot honestly fit a phone at once.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-rule px-4 py-4 md:px-8 md:py-6">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">{dateLabel(now)}</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">
            Welcome back.
          </h1>
        </div>
        <HeaderStats games={gamesRead} learn={learnRead} />
      </div>

      {/* Three even columns filling the width. items-start lets each card
          size to its own content rather than stretching to the tallest one. */}
      <div className="grid grid-cols-1 items-start gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 md:p-6">
        <PlayCard primary={!reviewDue} />
        <ReinforceCard read={reviewRead} now={now} />
        <LearnCard read={learnRead} />
        <RecentGamesCard read={gamesRead} now={now} />
        <PlaceholderCard title="Game analysis">
          Integrating to be part of the game itself. In the future an overview of the analysis will be available here.
        </PlaceholderCard>
        <PlaceholderCard title="Playing style">
          Recurring patterns across your games, once there are enough to read a trend from.
        </PlaceholderCard>
      </div>
    </div>
  );
}
