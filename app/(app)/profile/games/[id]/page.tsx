import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { loginPath } from "@/lib/auth/next-path";
import {
  describeDifficulty,
  describeOpponent,
  formatMoveCount,
  formatPlayedAt,
  resultLabel,
  SAVED_GAME_COLUMNS,
  type SavedGame,
} from "@/lib/game/history";
import { TIME_CONTROLS } from "@/lib/game/settings";
import { createClient } from "@/lib/supabase/server";

import { GameReplay, type MetaItem } from "./GameReplay";

export const metadata: Metadata = {
  title: "Game · One Pawn",
};

// Same guard as the delete route: an id that cannot be a uuid is a 404 here
// rather than a Postgres error about invalid input syntax.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) redirect(loginPath(`/profile/games/${id}`));
  if (!UUID.test(id)) notFound();

  const { data, error } = await supabase
    .from("games")
    .select(SAVED_GAME_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
    .returns<SavedGame>();

  if (error !== null) {
    console.error("[profile/game] query failed", error);
  }

  // Someone else's game reaches this the same way a deleted one does: the
  // select policy returns no row, and no row is a 404. Nothing tells the
  // visitor that the id exists at all.
  if (data === null) notFound();

  const meta: readonly MetaItem[] = [
    { label: "result", value: resultLabel(data.result, data.user_color) },
    { label: "opponent", value: describeOpponent(data.difficulty) },
    { label: "difficulty", value: describeDifficulty(data.difficulty) },
    { label: "time control", value: TIME_CONTROLS[data.time_control]?.label ?? data.time_control },
    { label: "played as", value: data.user_color },
    { label: "length", value: formatMoveCount(data.move_count) },
    { label: "date", value: formatPlayedAt(data.played_at) },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-dashed border-hairline px-4 py-3 md:px-6">
        <Link href="/profile" className="font-mono text-[11px] text-muted hover:text-ink">
          &larr; Back to profile
        </Link>
        <span className="font-mono text-[11px] text-muted">
          Replay · {formatPlayedAt(data.played_at)}
        </span>
      </div>

      <GameReplay pgn={data.pgn} orientation={data.user_color} meta={meta} />
    </div>
  );
}
