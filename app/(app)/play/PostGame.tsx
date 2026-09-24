"use client";

import Link from "next/link";

import { RetryButton } from "@/components/coach/CoachView";
import { RateLimitNotice } from "@/components/coach/RateLimitNotice";
import { Button, buttonClasses } from "@/components/ui/Button";
import { isRetriableFailure } from "@/lib/coach/client";
import { COMMENTARY_FAILURE_MESSAGE, firstSentence } from "@/lib/coach/display";
import type { GameStatsSummary } from "@/lib/analysis/summary";
import { formatClock } from "@/lib/game/clock";
import type { GameMode } from "@/lib/game/mode";
import type { GameEnd } from "@/lib/game/result";
import type { SaveState } from "@/lib/game/save";
import type { Side } from "@/lib/game/settings";

import type { CoachAnalysis } from "./useCoachAnalysis";
import type { PlayStats } from "./usePlayStats";

type PostGameProps = {
  end: GameEnd;
  moveCount: number;
  mode: GameMode;
  saveState: SaveState;
  isLoggedIn: boolean;
  // Null before there is anything to retry, which cannot happen while this
  // screen is mounted. Typed rather than assumed.
  onRetrySave: (() => void) | null;
  onRematch: () => void;
  onNewGame: () => void;
  // Coach-mode extras. Null in Play mode, where none of this renders. The id is
  // the saved game's id, present once the save has succeeded; the coach pipeline
  // and its retries need it.
  coach: CoachAnalysis | null;
  gameId: string | null;
  pgn: string | null;
  userColor: Side;
  // Play mode only.
  playStats: PlayStats;
  timeUsedMs: number;
};

// Play mode's three figures. The two counts come from the local engine pass
// and read as an ellipsis while it runs; time used is known the moment the game
// ends. Coach mode replaces this block with one sentence and a way into the
// coach view.
function statTiles(playStats: PlayStats, timeUsedMs: number): readonly { label: string; value: string }[] {
  const count = (pick: (stats: GameStatsSummary) => number): string =>
    playStats.status === "ready"
      ? String(pick(playStats.stats))
      : playStats.status === "analyzing"
        ? "…"
        : "--";

  return [
    { label: "Blunders", value: count((stats) => stats.blunders) },
    { label: "Best moves", value: count((stats) => stats.bestMoves) },
    { label: "Time used", value: formatClock(timeUsedMs) },
  ];
}

const NOTE = "mt-2 text-xs leading-relaxed text-graphite";
const INLINE_ACTION = "underline underline-offset-2 transition-colors hover:text-ink";

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

// The coach on the post-game screen is a doorway, not the room. It says how the
// game went in one sentence and hands the reader to the replay, where the
// commentary sits next to a board that can show the moves it is talking about.
// Repeating the notes here would mean reading them twice, once without a board.
function CoachSection({
  coach,
  gameId,
  onRetryAnalysis,
}: {
  coach: CoachAnalysis;
  gameId: string | null;
  onRetryAnalysis: (() => void) | null;
}) {
  const heading = (
    <p className="text-xs text-graphite">Coach</p>
  );

  if (coach.phase === "idle") {
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <p className={NOTE}>Analysis starts once the game is saved.</p>
      </div>
    );
  }

  if (coach.phase === "analyzing") {
    const percent =
      coach.progress.total === 0
        ? 0
        : Math.round((coach.progress.completed / coach.progress.total) * 100);
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <p className="mt-2 text-center text-xs text-graphite">
          Analysing move {coach.progress.completed} of {coach.progress.total}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-rule">
          <div className="h-full bg-info" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  // The generation is running. The retry is on screen but inert, so the wait
  // reads as a wait rather than as nothing happening, and an impatient second
  // press cannot start a second run of the same calls.
  if (coach.phase === "commentating") {
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <p className="mt-2 text-center text-xs text-graphite">Coach is thinking...</p>
        <div className="mt-2 flex justify-center">
          <RetryButton onClick={null} pending />
        </div>
      </div>
    );
  }

  // The day's coach analyses are used up. The engine analysis still ran and
  // saved (it is free and local), so the classifications are there to open, but
  // the write-up is what the limit gates and it did not happen.
  if (coach.phase === "ready" && coach.commentaryFailure === "rate_limited" && coach.rateLimit !== null) {
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <RateLimitNotice
          rateLimit={coach.rateLimit}
          extra="Rematch or start a new game instead; those stay unlimited."
          className="mt-2"
        />
        {gameId !== null && coach.analyses.length > 0 ? (
          <Link href={`/profile/games/${gameId}`} className={`${NOTE} ${INLINE_ACTION} inline-block`}>
            See where the game turned
          </Link>
        ) : null}
      </div>
    );
  }

  if (coach.phase === "error") {
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <p className="mt-2 text-xs leading-relaxed">
          {coach.error ?? "The analysis could not be completed."}
        </p>
        {onRetryAnalysis === null ? null : (
          <button
            type="button"
            onClick={onRetryAnalysis}
            className="mt-2 rounded border border-rule-strong px-3 py-1 text-xs transition-colors hover:bg-surface-sunk"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // Ready. A game with none of the user's moves has nothing to open.
  if (coach.analyses.length === 0) {
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <p className="mt-2 text-xs leading-relaxed text-graphite">
          None of your moves were available to analyse.
        </p>
      </div>
    );
  }

  const summary = coach.commentary?.summary ?? null;
  const failure = coach.commentaryFailure;

  return (
    <div className="mt-6 rounded border border-rule p-4 md:mt-8 md:p-6">
      {heading}
      <p className="mt-2 text-sm leading-relaxed">
        {failure === null && summary !== null
          ? firstSentence(summary)
          : COMMENTARY_FAILURE_MESSAGE[failure ?? "groq"]}
      </p>

      {/* A failure the student can do something about gets a button that
          re-POSTs. One that they cannot gets none: the coach view still opens
          and shows the classifications, which are computed and reliable. */}
      {failure !== null && isRetriableFailure(failure) && gameId !== null ? (
        <RetryButton onClick={() => coach.retryCommentary(gameId)} className="mt-3" />
      ) : null}
      {gameId === null ? (
        // The save has not landed, so there is no page to open yet. The game is
        // still in the profile once it does; this only guards the dead link.
        <p className={NOTE}>The full coach view opens from your profile once this game saves.</p>
      ) : (
        <Link
          href={`/profile/games/${gameId}`}
          className={`${buttonClasses("secondary")} mt-3 w-full`}
        >
          Open coach view
        </Link>
      )}
    </div>
  );
}

// A modal centred over the dimmed board on desktop, a bottom sheet on mobile.
// The board stays mounted behind it, per wireframes 03 and 03m.
export function PostGame({
  end,
  moveCount,
  mode,
  saveState,
  isLoggedIn,
  onRetrySave,
  onRematch,
  onNewGame,
  coach,
  gameId,
  pgn,
  userColor,
  playStats,
  timeUsedMs,
}: PostGameProps) {
  const isCoach = mode === "coach" && coach !== null;
  const stats = statTiles(playStats, timeUsedMs);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game result"
      className="fixed inset-0 z-20 flex items-end justify-center bg-page/80 md:items-center"
    >
      <div className="flex max-h-[92vh] w-full flex-col overflow-y-auto border-t border-rule bg-surface p-6 md:w-[560px] md:rounded md:border md:p-8">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">Result</div>
          {mode === "coach" ? (
            <span className="rounded-sm border border-rule px-2 py-1 text-xs text-graphite">Coach mode</span>
          ) : null}
        </div>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">{end.headline}</h2>
        <p className="mt-1 text-sm text-graphite">
          {end.reason} in {moveCount} {moveCount === 1 ? "move" : "moves"}
        </p>

        {isCoach ? (
          <CoachSection
            coach={coach}
            gameId={gameId}
            onRetryAnalysis={
              gameId === null || pgn === null ? null : () => coach.retryAnalysis(gameId, pgn, userColor)
            }
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 rounded border border-rule md:mt-8">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`p-3 md:p-6 ${index < stats.length - 1 ? "border-r border-rule" : ""}`}
                >
                  <div className="font-mono text-xl font-medium tabular-nums">{stat.value}</div>
                  <div className="mt-1 text-xs text-graphite">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            {playStats.status === "analyzing" ? (
              <p className={NOTE}>Analysing your moves...</p>
            ) : playStats.status === "error" ? (
              <p className={NOTE}>Your moves could not be analysed.</p>
            ) : null}
          </>
        )}

        <div aria-live="polite">
          <SaveIndicator saveState={saveState} isLoggedIn={isLoggedIn} onRetrySave={onRetrySave} />
        </div>

        <div className="mt-6 flex flex-col gap-2 md:mt-8 md:flex-row md:gap-3">
          <Button variant="primary" className="flex-1 py-4" onClick={onRematch}>
            Rematch
          </Button>
          <Button variant="secondary" className="flex-1 py-4" onClick={onNewGame}>
            New game
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-graphite">
          Rematch keeps the same settings and swaps colours.
        </p>

        {/* A way out that is not another game. Kept as a text link below the two
            game actions rather than a third button in the row, so it does not
            compete with them for the primary action or crowd them at 375px.
            Home for a signed-in player, the landing page for a guest. */}
        <div className="mt-4 border-t border-rule pt-4 text-center">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="text-info-text text-xs underline underline-offset-2 transition-colors hover:text-ink"
          >
            Back to menu
          </Link>
        </div>
      </div>
    </div>
  );
}
