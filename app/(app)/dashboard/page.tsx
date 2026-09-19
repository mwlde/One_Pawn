import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ProgressBar } from "@/app/(app)/learn/ProgressBar";
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

const PRIMARY_LINK =
  "inline-block border border-ink bg-ink px-4 py-2.5 text-center text-sm font-semibold leading-none text-panel transition-colors hover:bg-black";
const SECONDARY_LINK =
  "inline-block border border-ink px-4 py-2.5 text-center text-sm font-semibold leading-none transition-colors hover:bg-panel";
const MONO_NOTE = "font-mono text-[11px] text-muted";
// No h-full: the utility cards size to their content so Reinforce can shrink to
// nothing on a quiet day. A card that should fill its slot is wrapped in a
// flex-1 cell instead.
const CARD = "flex min-h-0 flex-col gap-3 border border-ink p-4 md:p-5";

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
      <h2 className="text-sm font-semibold md:text-base">{title}</h2>
      {note !== undefined ? <span className={MONO_NOTE}>{note}</span> : null}
    </div>
  );
}

function LoadFailedCard({ title }: { title: string }) {
  return (
    <div className={CARD}>
      <CardHeading title={title} />
      <p className="text-xs leading-relaxed text-muted">
        This could not be loaded. Refresh the page to try again.
      </p>
    </div>
  );
}

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold leading-none md:text-xl">
        {value}
        {sub !== undefined ? (
          <span className="ml-1.5 font-mono text-[10px] font-normal text-muted">{sub}</span>
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
      <StatCell key="games" label="GAMES" value={String(games.games.totalCount)} />,
      <StatCell
        key="week"
        label="THIS WEEK"
        value={String(games.games.weekStats.played)}
        sub={games.games.weekStats.played > 0 ? weekRecord(games.games.weekStats) : undefined}
      />,
    );
  }

  if (learn.status === "known") {
    cells.push(
      <StatCell
        key="lessons"
        label="LESSONS"
        value={`${learn.learn.lessonsDone} / ${learn.learn.lessonsTotal}`}
      />,
    );
  }

  if (cells.length === 0) return null;

  return <div className="flex gap-6 md:gap-8">{cells}</div>;
}

function PlayCard() {
  return (
    <div className={`${CARD} bg-panel`}>
      <CardHeading title="Play a game" note="VS COMPUTER" />
      <p className="text-sm leading-relaxed text-muted">
        Pick a side, a difficulty and a time control, then play the engine.
      </p>
      <Link href="/play" className={`${PRIMARY_LINK} mt-auto`}>
        Start a game →
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
      ? { href: `/learn/${resumeTrack}`, label: `Resume ${TRACK_INFO[resumeTrack].title} →`, primary: true }
      : hasStarted
        ? { href: "/learn", label: "Browse tracks →", primary: false }
        : { href: "/learn", label: "Start learning →", primary: false };

  return (
    <div className={CARD}>
      <CardHeading title="Learn" />
      <ul className="flex flex-col gap-2.5">
        {TRACKS.map((track) => {
          const count = byTrack.get(track) ?? { done: 0, total: 0 };
          const empty = count.total === 0;
          return (
            <li key={track}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">{TRACK_INFO[track].title}</span>
                <span className="font-mono text-[10px] text-muted">
                  {empty ? "coming soon" : `${count.done} / ${count.total}`}
                </span>
              </div>
              {!empty ? (
                <div className="mt-1.5">
                  <ProgressBar done={count.done} total={count.total} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Link href={cta.href} className={`${cta.primary ? PRIMARY_LINK : SECONDARY_LINK} mt-auto`}>
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
        <p className="text-sm leading-relaxed text-muted">
          Finish a lesson in Learn without hints to add it to your review queue.
        </p>
        <Link href="/learn" className={`${SECONDARY_LINK} mt-auto`}>
          Open Learn →
        </Link>
      </div>
    );
  }

  if (queue.due.length === 0) {
    return (
      <div className={CARD}>
        <CardHeading title="Reinforce" note="all caught up" />
        <p className="text-sm leading-relaxed text-muted">
          {queue.nextDueAt === null
            ? "Nothing is scheduled yet."
            : `Nothing is due. Next review ${formatDueIn(queue.nextDueAt, now)}.`}
        </p>
        <Link href="/reinforce" className={`${SECONDARY_LINK} mt-auto`}>
          Open Reinforce →
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
      <div className="text-xl font-semibold md:text-2xl">{formatDueCount(queue.due.length)}</div>
      <ul className="flex flex-col gap-1.5">
        {queue.due.slice(0, 3).map((item) => (
          <li
            key={item.lesson.id}
            className="flex items-center justify-between gap-3 border border-ink px-3 py-2"
          >
            <span className="min-w-0 truncate text-[13px] font-semibold">{item.lesson.title}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted">
              {TRACK_INFO[item.lesson.track].title}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/reinforce/review" className={`${PRIMARY_LINK} mt-auto`}>
        Start review ({queue.due.length}) →
      </Link>
    </div>
  );
}

function GameRow({ game, now }: { game: GameSummary; now: Date }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-dashed border-hairline py-2 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[13px] font-semibold">{resultLabel(game.result, game.user_color)}</span>
        <span className="truncate font-mono text-[10px] text-muted">
          {describeOpponent(game.difficulty)}
        </span>
        {game.mode === "coach" ? (
          <span
            title="Played in coach mode"
            className="shrink-0 border border-hairline px-1 font-mono text-[9px] uppercase tracking-wide text-muted"
          >
            coach
          </span>
        ) : null}
      </div>
      <span className="shrink-0 font-mono text-[10px] text-muted">
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
        <p className="text-sm leading-relaxed text-muted">
          You have not played a game yet. Your last games will show up here.
        </p>
        <Link href="/play" className={`${SECONDARY_LINK} mt-auto`}>
          Play your first game →
        </Link>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <CardHeading
        title="Recent games"
        note={
          <Link href="/profile" className="hover:text-ink">
            all games →
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

  return (
    // Fills the shell's main area and clips rather than scrolls on md+, so the
    // dashboard reads as one screen. Mobile stacks and scrolls: everything here
    // cannot honestly fit a phone at once.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-dashed border-hairline px-4 py-4 md:px-10 md:py-5">
        <div className="min-w-0">
          <div className="font-mono text-[10px] tracking-[0.14em] text-muted">{dateLabel(now)}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.01em] md:text-2xl">
            Welcome back.
          </h1>
          {user.email !== undefined ? (
            <p className="mt-0.5 max-w-full truncate font-mono text-[11px] text-muted">
              {user.email}
            </p>
          ) : null}
        </div>
        <HeaderStats games={gamesRead} learn={learnRead} />
      </div>

      {/* Three even columns filling the width. Cards in a row share a height
          (the grid stretches them), and each card's primary action is pinned to
          the bottom with mt-auto so those actions line up across the row. */}
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 md:p-6">
        <PlayCard />
        <ReinforceCard read={reviewRead} now={now} />
        <LearnCard read={learnRead} />
        <RecentGamesCard read={gamesRead} now={now} />
        <PlaceholderCard title="Game analysis">
          Where each finished game turned, and the moves worth a second look. Coming with Phase 4
          analysis.
        </PlaceholderCard>
        <PlaceholderCard title="Playing style">
          Recurring patterns across your games, once there are enough to read a trend from.
        </PlaceholderCard>
      </div>
    </div>
  );
}
