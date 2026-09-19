"use client";

import { Chess } from "chess.js";
import Link from "next/link";
import { useMemo } from "react";

import { CoachView } from "@/components/coach/CoachView";
import { Button } from "@/components/ui/Button";
import { buildClassificationDisplay, buildNotableDisplay } from "@/lib/coach/display";
import type { GameMode } from "@/lib/game/mode";
import type { GameEnd } from "@/lib/game/result";
import type { SaveState } from "@/lib/game/save";
import type { Side } from "@/lib/game/settings";

import type { CoachAnalysis } from "./useCoachAnalysis";

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
};

// Play mode's three stubs, unchanged: they still read as placeholders until a
// later phase fills them. Coach mode replaces this block with the coach view.
const STATS: readonly { label: string; value: string }[] = [
  { label: "accuracy", value: "--" },
  { label: "blunders", value: "--" },
  { label: "best moves", value: "--" },
];

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

// The finished game's positions, so the coach view can name moves in SAN. Built
// from the frozen PGN, not the live board.
type ReplayPositions = { fens: string[]; sanByPly: string[] };

function buildPositions(pgn: string | null): ReplayPositions | null {
  if (pgn === null) return null;
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }
  const history = chess.history({ verbose: true });
  return {
    fens: [history[0]?.before ?? chess.fen(), ...history.map((move) => move.after)],
    sanByPly: history.map((move) => move.san),
  };
}

function CoachSection({
  coach,
  gameId,
  positions,
  onRetryAnalysis,
}: {
  coach: CoachAnalysis;
  gameId: string | null;
  positions: ReplayPositions | null;
  onRetryAnalysis: (() => void) | null;
}) {
  const notableMoves = useMemo(() => {
    if (coach.commentary === null || positions === null) return [];
    return buildNotableDisplay(coach.commentary.moves, coach.analyses, positions.fens, positions.sanByPly);
  }, [coach.commentary, coach.analyses, positions]);

  const fallbackMoves = useMemo(() => {
    if (positions === null) return [];
    return buildClassificationDisplay(coach.analyses, positions.fens, positions.sanByPly);
  }, [coach.analyses, positions]);

  const heading = (
    <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-muted md:mt-8">
      Coach
    </p>
  );

  if (coach.phase === "idle") {
    return (
      <>
        {heading}
        <p className={NOTE}>Analysis starts once the game is saved.</p>
      </>
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
        <p className="mt-2 text-center font-mono text-[11px] text-muted">
          Analysing move {coach.progress.completed} of {coach.progress.total}
        </p>
        <div className="mt-2 h-2 w-full border border-hairline">
          <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  if (coach.phase === "commentating") {
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <p className="mt-2 text-center font-mono text-[11px] text-muted">Coach is thinking...</p>
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
            className="mt-2 border border-ink px-3 py-1 font-mono text-[11px] hover:bg-tint"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // Ready. Either the coach view, the degraded classifications, or, for a game
  // with none of the user's moves, a plain note.
  if (coach.analyses.length === 0) {
    return (
      <div className="mt-6 md:mt-8">
        {heading}
        <p className="mt-2 text-xs leading-relaxed text-muted">
          None of your moves were available to analyse.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex max-h-[42vh] flex-col border border-ink md:mt-8">
      <CoachView
        summary={coach.commentary?.summary ?? null}
        notableMoves={notableMoves}
        commentaryUnavailable={coach.commentaryFailed}
        fallbackMoves={fallbackMoves}
        onRetryCommentary={gameId === null ? null : () => coach.retryCommentary(gameId)}
      />
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
}: PostGameProps) {
  const positions = useMemo(() => buildPositions(pgn), [pgn]);
  const isCoach = mode === "coach" && coach !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game result"
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 md:items-center"
    >
      <div className="flex max-h-[92vh] w-full flex-col overflow-y-auto border-t-2 border-ink bg-panel p-5 md:w-[560px] md:border md:p-10">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Result</div>
          {mode === "coach" ? (
            <span className="border border-ink px-2 py-0.5 font-mono text-[10px]">Coach mode</span>
          ) : null}
        </div>
        <h2 className="mt-1 text-3xl font-bold tracking-tight md:text-5xl">{end.headline}</h2>
        <p className="mt-1 text-sm text-muted">
          {end.reason} in {moveCount} {moveCount === 1 ? "move" : "moves"}
        </p>

        {isCoach ? (
          <CoachSection
            coach={coach}
            gameId={gameId}
            positions={positions}
            onRetryAnalysis={
              gameId === null || pgn === null ? null : () => coach.retryAnalysis(gameId, pgn, userColor)
            }
          />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 border border-ink md:mt-8">
              {STATS.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`p-3 md:p-5 ${index < STATS.length - 1 ? "border-r border-ink" : ""}`}
                >
                  <div className="text-xl font-semibold tracking-tight md:text-4xl">{stat.value}</div>
                  <div className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted md:mt-1.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <p className={NOTE}>Analysis arrives in Phase 4.</p>
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
        <p className="mt-3 text-center text-xs text-muted">
          Rematch keeps the same settings and swaps colours.
        </p>
      </div>
    </div>
  );
}
