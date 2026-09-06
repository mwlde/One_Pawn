"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ResultLabel } from "@/lib/game/history";

// A row as the list draws it. Every field is already formatted: this component
// owns the interaction, the server owns the words. See toRow in page.tsx.
export type GameRow = {
  id: string;
  result: ResultLabel;
  opponent: string;
  playedAt: string;
  moves: string;
};

// Wireframe 06 draws the result as a bordered pill with no colour in it, so the
// four outcomes are told apart by weight instead: a win is filled, a draw is
// dashed, and the two ways of losing are plain.
const BADGE_CLASSES: Record<ResultLabel, string> = {
  "You won": "border-ink bg-ink text-panel",
  "You lost": "border-ink",
  Draw: "border-dashed border-ink",
  "You resigned": "border-ink text-muted",
};

const COLUMNS = "md:grid md:grid-cols-[132px_1fr_110px_120px_150px] md:items-center md:gap-4";

const INLINE_ACTION =
  "font-mono text-[10px] underline underline-offset-2 text-muted hover:text-ink disabled:no-underline disabled:opacity-50";

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-hairline px-6 py-16 text-center">
      <div
        aria-hidden
        className="h-20 w-20 border border-hairline opacity-60"
        style={{
          background:
            "repeating-conic-gradient(var(--color-tint) 0 25%, var(--color-surface) 0 50%) 0 0 / 50% 50%",
        }}
      />
      <p className="text-base font-semibold">No games yet</p>
      <p className="max-w-[240px] text-xs leading-relaxed text-muted">
        Play your first game and it will show up here.
      </p>
      <Link
        href="/play"
        className="mt-1 border border-ink bg-ink px-6 py-3 text-[13px] font-semibold text-panel hover:bg-black"
      >
        Play now →
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
        className={`hidden border-b border-ink py-2.5 font-mono text-[10px] tracking-[0.08em] text-muted ${COLUMNS}`}
      >
        <div>RESULT</div>
        <div>OPPONENT</div>
        <div>MOVES</div>
        <div>DATE</div>
        <div />
      </div>

      <ul>
        {games.map((row) => {
          const armed = armedId === row.id;

          return (
            <li key={row.id} className="border-b border-dashed border-hairline">
              <div className={`flex flex-col gap-2 py-3.5 text-[13px] ${COLUMNS}`}>
                <div>
                  <span
                    className={`border px-2 py-0.5 font-mono text-[10px] ${BADGE_CLASSES[row.result]}`}
                  >
                    {row.result}
                  </span>
                </div>
                <div>{row.opponent}</div>
                <div className="font-mono text-xs text-muted md:text-[13px] md:text-ink">
                  {row.moves}
                </div>
                <div className="text-xs text-muted md:text-[13px]">{row.playedAt}</div>

                <div className="flex items-center gap-3 md:justify-end">
                  {armed ? (
                    <>
                      <span className="font-mono text-[10px] text-ink">Delete this game?</span>
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
                        className="border border-ink px-3 py-1.5 font-mono text-[10px] hover:bg-tint"
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
                <p role="alert" className="pb-3 font-mono text-[10px] text-ink">
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
