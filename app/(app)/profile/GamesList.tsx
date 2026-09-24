"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import type { ResultLabel } from "@/lib/game/history";

// A row as the list draws it. Every field is already formatted: this component
// owns the interaction, the server owns the words. See toRow in page.tsx.
export type GameRow = {
  id: string;
  result: ResultLabel;
  opponent: string;
  playedAt: string;
  moves: string;
  // Played in coach mode. Shown as a small marker, not filtered or sorted on.
  coach: boolean;
};

// The result is a tag with no colour in it. The label carries the outcome; a
// win reads as selected, and the rest step down in weight.
const BADGE_CLASSES: Record<ResultLabel, string> = {
  "You won": "border-ink bg-surface-sunk font-medium text-ink",
  "You lost": "border-rule-strong text-ink",
  Draw: "border-rule-strong text-graphite",
  "You resigned": "border-rule text-graphite",
};

const COLUMNS = "md:grid md:grid-cols-[132px_1fr_110px_120px_150px] md:items-center md:gap-4";

const INLINE_ACTION =
  "text-xs underline underline-offset-2 text-graphite transition-colors hover:text-ink disabled:no-underline disabled:opacity-50";

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded border border-rule bg-surface px-6 py-12 text-center">
      <div
        aria-hidden
        className="h-20 w-20 border border-rule opacity-60"
        style={{
          background:
            "repeating-conic-gradient(var(--board-dark) 0 25%, var(--board-light) 0 50%) 0 0 / 50% 50%",
        }}
      />
      <p className="font-display text-xl font-medium">No games yet</p>
      <p className="max-w-[240px] text-xs leading-relaxed text-graphite">
        Play your first game and it will show up here.
      </p>
      <Link
        href="/play"
        className={`${buttonClasses("primary")} mt-1`}
      >
        Play now
      </Link>
    </div>
  );
}

export function GamesList({ rows }: { rows: GameRow[] }) {
  const router = useRouter();
  const [games, setGames] = useState(rows);
  const [lastRows, setLastRows] = useState(rows);
  // Which row is one click into its confirmation, and which one failed to
  // delete. Ids rather than booleans, so only the row that was pressed changes.
  //
  // There is no pending state: the row leaves the list the moment Confirm is
  // pressed, so there is nothing left on screen to show a spinner on.
  const [armedId, setArmedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  // Follow the server's list when it changes, which happens after a successful
  // delete calls refresh(). Adjusted during render rather than in an effect,
  // the same way TopNav follows the session it was seeded with.
  if (rows !== lastRows) {
    setLastRows(rows);
    setGames(rows);
    setArmedId(null);
    setFailedId(null);
  }

  async function handleDelete(row: GameRow) {
    const index = games.findIndex((game) => game.id === row.id);
    setArmedId(null);
    setFailedId(null);
    // Optimistic: the row goes now, and comes back at the same position if the
    // request does not land. Putting it back at the end would silently reorder
    // a list whose order is the one thing it promises.
    setGames((current) => current.filter((game) => game.id !== row.id));

    let deleted = false;
    try {
      const response = await fetch(`/api/games/${row.id}`, { method: "DELETE" });
      deleted = response.ok;
    } catch {
      deleted = false;
    }

    if (!deleted) {
      setGames((current) => {
        const restored = [...current];
        restored.splice(index, 0, row);
        return restored;
      });
      setFailedId(row.id);
      return;
    }

    // The stats header is a server component and still counts the deleted game.
    // Re-running the route updates it, and hands this list a new rows prop that
    // the sync above adopts.
    router.refresh();
  }

  if (games.length === 0) return <EmptyState />;

  return (
    <div>
      <div
        className={`hidden border-b border-rule-strong py-3 text-xs text-graphite ${COLUMNS}`}
      >
        <div>Result</div>
        <div>Opponent</div>
        <div>Moves</div>
        <div>Date</div>
        <div />
      </div>

      <ul>
        {games.map((row) => {
          const armed = armedId === row.id;

          return (
            <li key={row.id} className="border-b border-rule">
              <div className={`flex flex-col gap-2 py-3 text-sm ${COLUMNS}`}>
                <div>
                  <span
                    className={`rounded-sm border px-2 py-1 text-xs ${BADGE_CLASSES[row.result]}`}
                  >
                    {row.result}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{row.opponent}</span>
                  {row.coach ? (
                    <span
                      title="Played in coach mode"
                      className="shrink-0 rounded-sm border border-rule px-1 text-xs text-graphite"
                    >
                      Coach
                    </span>
                  ) : null}
                </div>
                <div className="font-mono text-xs tabular-nums text-graphite md:text-sm md:text-ink">
                  {row.moves}
                </div>
                <div className="font-mono text-xs tabular-nums text-graphite md:text-sm">{row.playedAt}</div>

                <div className="flex items-center gap-3 md:justify-end">
                  {armed ? (
                    <>
                      <span className="text-xs text-ink">Delete this game?</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row)}
                        className={INLINE_ACTION}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setArmedId(null)}
                        className={INLINE_ACTION}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/profile/games/${row.id}`}
                        className="rounded border border-rule-strong px-3 py-2 text-xs transition-colors hover:bg-surface-sunk"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => setArmedId(row.id)}
                        className={INLINE_ACTION}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {failedId === row.id ? (
                <p role="alert" className="pb-3 text-xs text-ink">
                  That game could not be deleted. It is still here. Try again.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
