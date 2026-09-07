import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loginPath } from "@/lib/auth/next-path";
import {
  computeStats,
  describeOpponent,
  formatMoveCount,
  formatPlayedAt,
  formatWinRate,
  resultLabel,
  GAME_SUMMARY_COLUMNS,
  type GameStats,
  type GameSummary,
} from "@/lib/game/history";
import { createClient } from "@/lib/supabase/server";

import { DeleteAccount } from "./DeleteAccount";
import { GamesList, type GameRow } from "./GamesList";

export const metadata: Metadata = {
  title: "Profile · One Pawn",
};

// No pagination in the alpha. Fifty rows is more history than a Phase 1 tester
// will produce and small enough to render in one pass.
const GAME_LIMIT = 50;

// Wireframe 06 puts four figures across the top. Phase 1 can answer six of its
// own, and the two it cannot (accuracy, daily streak) are left out rather than
// stubbed: a "--" in a stats header reads as a broken number, not as a promise.
function StatsHeader({ stats }: { stats: GameStats }) {
  const cells: readonly { label: string; value: string }[] = [
    { label: "games played", value: String(stats.played) },
    { label: "win rate", value: formatWinRate(stats.winRate) },
    { label: "wins", value: String(stats.wins) },
    { label: "losses", value: String(stats.losses) },
    { label: "draws", value: String(stats.draws) },
    { label: "resigned", value: String(stats.resigned) },
  ];

  return (
    <div className="grid grid-cols-2 border-b border-dashed border-hairline sm:grid-cols-3 lg:grid-cols-6">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="border-b border-r border-dashed border-hairline p-4 last:border-r-0 md:p-6 lg:border-b-0"
        >
          <div className="text-2xl font-semibold md:text-4xl">{cell.value}</div>
          <div className="mt-1.5 font-mono text-[10px] tracking-[0.08em] text-muted">
            {cell.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// Everything the row shows is formatted here, on the server, and handed to the
// client component as strings. The dates are the reason: "3 hours ago" computed
// during hydration can land on the other side of a boundary from the one the
// server rendered, and React reports that as a mismatch.
function toRow(game: GameSummary): GameRow {
  return {
    id: game.id,
    result: resultLabel(game.result, game.user_color),
    opponent: describeOpponent(game.difficulty),
    playedAt: formatPlayedAt(game.played_at),
    moves: formatMoveCount(game.move_count),
  };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) redirect(loginPath("/profile"));

  // The user_id filter is redundant: the select policy already pins every
  // readable row to auth.uid(). It is written out anyway so the query says what
  // it returns without the reader having to go and read the policy.
  const { data, error } = await supabase
    .from("games")
    .select(GAME_SUMMARY_COLUMNS)
    .eq("user_id", user.id)
    .order("played_at", { ascending: false })
    .limit(GAME_LIMIT)
    // The client has no generated database types, so a select comes back as
    // any. The shape is asserted here rather than validated: every field is
    // constrained by the table's own check constraints, so a row that does not
    // match this type is a schema drift, not untrusted input.
    .returns<GameSummary[]>();

  if (error !== null) {
    console.error("[profile] games query failed", error);
  }

  const games = data ?? [];

  const header = (
    <div className="border-b border-dashed border-hairline px-4 py-6 md:px-10 md:py-8">
      <div className="font-mono text-[10px] tracking-[0.14em] text-muted">PROFILE</div>
      <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em] md:text-3xl">{user.email}</h1>
    </div>
  );

  // A failed query and a genuinely empty history are the same empty array, so
  // the stats are held back rather than shown as six zeros next to an error
  // that says the numbers are not known.
  if (error !== null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        <div className="px-4 py-6 md:px-10">
          <p className="border border-ink bg-panel px-4 py-3 text-xs">
            Your games could not be loaded. Refresh the page to try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}

      <StatsHeader stats={computeStats(games)} />

      <div className="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-10">
        <h2 className="mb-4 text-base font-semibold">Past games</h2>
        <GamesList rows={games.map(toRow)} />

        {/* The address is read from the session here rather than typed into the
            component, so the string the confirmation is checked against is the
            one on the account. user.email is optional on Supabase's user type:
            an account without one cannot confirm a deletion this way, so the
            section is left out rather than shown with nothing to type. */}
        {user.email ? <DeleteAccount email={user.email} /> : null}
      </div>
    </div>
  );
}
