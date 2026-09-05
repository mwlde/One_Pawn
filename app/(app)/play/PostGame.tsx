"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import type { GameEnd } from "@/lib/game/result";
import type { SaveState } from "@/lib/game/save";

type PostGameProps = {
  end: GameEnd;
  moveCount: number;
  saveState: SaveState;
  isLoggedIn: boolean;
  // Null before there is anything to retry, which cannot happen while this
  // screen is mounted. Typed rather than assumed.
  onRetrySave: (() => void) | null;
  onRematch: () => void;
  onNewGame: () => void;
};

// All three are Phase 4 work: they need a full engine pass over every position
// in the game, which is post-game analysis, not something the game screen can
// answer. Shown as stubs so the layout is the real one when the numbers land.
const STATS: readonly { label: string; value: string }[] = [
  { label: "accuracy", value: "--" },
  { label: "blunders", value: "--" },
  { label: "best moves", value: "--" },
];

// The wireframe's post-game screen has no save line in it, so this borrows the
// weight of the footnote already under the stats rather than inventing a panel.
// One line, muted, no border: it should read as a receipt, not as a control.
const NOTE = "mt-2 font-mono text-[10px] leading-relaxed text-muted";
const INLINE_ACTION = "underline underline-offset-2 hover:text-ink";

function SaveIndicator({
  saveState,
  isLoggedIn,
  onRetrySave,
}: Pick<PostGameProps, "saveState" | "isLoggedIn" | "onRetrySave">) {
  // Read before the logged-out case: a session that expired mid-game leaves the
  // user logged out holding a failed save, and the error is the better message.
  if (saveState.status === "error") {
    if (saveState.error === "not_authenticated") {
      return (
        <p className={NOTE}>
          Session expired.{" "}
          <Link href="/login" className={INLINE_ACTION}>
            Log in again
          </Link>{" "}
          to save this game.
        </p>
      );
    }

    return (
      <p className={NOTE}>
        {saveState.error === "email_not_verified"
          ? "Email verification required. Open the link in your inbox, then "
          : "Save failed. "}
        {onRetrySave === null ? null : (
          <button type="button" onClick={onRetrySave} className={INLINE_ACTION}>
            Retry
          </button>
        )}
      </p>
    );
  }

  if (!isLoggedIn) {
    return (
      <p className={NOTE}>
        Not saved.{" "}
        <Link href="/login" className={INLINE_ACTION}>
          Log in
        </Link>{" "}
        to save games.
      </p>
    );
  }

  if (saveState.status === "saving") return <p className={NOTE}>Saving...</p>;
  if (saveState.status === "saved") return <p className={NOTE}>Saved to your profile.</p>;

  // Idle and logged in: the effect is about to fire. Anything here would flash.
  return null;
}

// A modal centred over the dimmed board on desktop, a bottom sheet on mobile.
// The board stays mounted behind it, per wireframes 03 and 03m.
export function PostGame({
  end,
  moveCount,
  saveState,
  isLoggedIn,
  onRetrySave,
  onRematch,
  onNewGame,
}: PostGameProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game result"
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 md:items-center"
    >
      <div className="w-full border-t-2 border-ink bg-panel p-5 md:w-[560px] md:border md:p-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          Result
        </div>
        <h2 className="mt-1 text-3xl font-bold tracking-tight md:text-5xl">{end.headline}</h2>
        <p className="mt-1 text-sm text-muted">
          {end.reason} in {moveCount} {moveCount === 1 ? "move" : "moves"}
        </p>

        <div className="mt-6 grid grid-cols-3 border border-ink md:mt-8">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className={`p-3 md:p-5 ${index < STATS.length - 1 ? "border-r border-ink" : ""}`}
            >
              <div className="text-xl font-semibold tracking-tight md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted md:mt-1.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <p className={NOTE}>Analysis arrives in Phase 4.</p>

        <div aria-live="polite">
          <SaveIndicator
            saveState={saveState}
            isLoggedIn={isLoggedIn}
            onRetrySave={onRetrySave}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 md:mt-8 md:flex-row md:gap-3">
          <Button variant="primary" className="flex-1 py-4" onClick={onRematch}>
            Rematch
          </Button>
          <Button variant="secondary" className="flex-1 py-4" onClick={onNewGame}>
            New game
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Rematch keeps the same settings and swaps colours.
        </p>
      </div>
    </div>
  );
}
