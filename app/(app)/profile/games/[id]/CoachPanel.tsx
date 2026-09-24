"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CoachView, RetryButton } from "@/components/coach/CoachView";
import { RateLimitNotice } from "@/components/coach/RateLimitNotice";
import { useEngineContext } from "@/components/EngineProvider";
import { analyzeGame } from "@/lib/analysis/analyze-game";
import { saveAnalysis, type StoredAnalysis } from "@/lib/analysis/client";
import { ANALYSIS_DEPTH } from "@/lib/analysis/types";
import {
  generateCommentary,
  isRetriableFailure,
  type CommentaryFailure,
} from "@/lib/coach/client";
import { COMMENTARY_FAILURE_MESSAGE, type ClassificationDisplay } from "@/lib/coach/display";
import type { CoachRateLimit } from "@/lib/coach/rate-limit";
import type { GameCommentary } from "@/lib/coach/types";
import type { Side } from "@/lib/game/settings";

type CoachPanelProps = {
  gameId: string;
  pgn: string;
  userColor: Side;
  // Whatever the page already read. Empty means the game was never analysed.
  analyses: StoredAnalysis[];
  // The plain classification list, for the degraded view below.
  fallbackMoves: ClassificationDisplay[];
  totalUserMoves: number;
  // The user's coach usage, read on the server. Null when it could not be read;
  // the count is then left off the button. Updated in place if a live 429 comes
  // back, so the message reflects the moment it was hit.
  initialRateLimit: CoachRateLimit | null;
  // Results go back to the replay screen, which owns them: commentary arriving
  // is what turns this panel's page into the coach view.
  onAnalyses: (rows: StoredAnalysis[]) => void;
  onCommentary: (commentary: GameCommentary) => void;
  onSelectPly: (ply: number) => void;
};

// The generate half of the coach, for a Coach-mode game that has no commentary
// stored. The common case never reaches this panel at all: a game commentated
// when it finished arrives with its notes already read on the server, and the
// replay screen renders the coach view instead. This covers the rest, which is
// a game whose commentary failed at the time and a game saved before it
// finished analysing.
//
// The states below exist to keep one question answerable at all times: is the
// coach still working, or did it stop? A single "something went wrong" cannot
// tell those apart, and a student who cannot tell will either press the button
// again (spending a second run of a call we already made) or give up on one
// that only needed asking twice.
type Status =
  | "prompt"
  | "analyzing"
  | "generating"
  | "failed"
  | "refused"
  | "rate_limited"
  | "error";

// Whichever of the two rate-limit shapes is in hand: the server's CoachRateLimit
// or the client's RateLimitInfo from a 429. Both carry the three fields the
// notice and the count need.
type RateLimitLike = { used: number; limit: number; resetsAt: Date | null };

export function CoachPanel({
  gameId,
  pgn,
  userColor,
  analyses,
  fallbackMoves,
  totalUserMoves,
  initialRateLimit,
  onAnalyses,
  onCommentary,
  onSelectPly,
}: CoachPanelProps) {
  const engine = useEngineContext();

  const [status, setStatus] = useState<Status>("prompt");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<CommentaryFailure | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitLike | null>(initialRateLimit);

  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  // A run already under way. Checked rather than relying on the button being
  // disabled: the disabled attribute is a hint to the pointer, not a guarantee,
  // and every path through here ends in a paid engine pass or a Groq call.
  const inFlightRef = useRef(false);

  const generate = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    setFailure(null);

    try {
      let currentAnalyses = analyses;

      // Run the engine only if the analysis is not already saved. Revisiting a
      // game whose commentary failed should not pay for the analysis again.
      if (currentAnalyses.length === 0) {
        setStatus("analyzing");
        setProgress({ completed: 0, total: totalUserMoves });
        try {
          const computed = await analyzeGame(pgn, userColor, engine, ANALYSIS_DEPTH, (completed, total) => {
            if (activeRef.current) setProgress({ completed, total });
          });
          if (computed.length === 0) {
            if (!activeRef.current) return;
            setStatus("prompt");
            return;
          }
          currentAnalyses = await saveAnalysis(gameId, computed);
          if (!activeRef.current) return;
          onAnalyses(currentAnalyses);
        } catch (cause) {
          if (!activeRef.current) return;
          setError(cause instanceof Error ? cause.message : "The analysis could not be completed.");
          setStatus("error");
          return;
        }
      }

      setStatus("generating");
      const result = await generateCommentary(gameId);
      if (!activeRef.current) return;

      // A successful generation hands the commentary up and this panel is gone:
      // the replay screen re-renders as the coach view. Only a failure stays
      // here, and which failure decides whether a retry is offered at all.
      onCommentary(result.commentary);
      if (result.failure === null) {
        setStatus("prompt");
        return;
      }
      if (result.failure === "rate_limited") {
        if (result.rateLimit !== null) setRateLimit(result.rateLimit);
        setStatus("rate_limited");
        return;
      }
      setFailure(result.failure);
      setStatus(isRetriableFailure(result.failure) ? "failed" : "refused");
    } finally {
      inFlightRef.current = false;
    }
  }, [analyses, engine, gameId, onAnalyses, onCommentary, pgn, totalUserMoves, userColor]);

  // At the limit before a single click: no button to press, so the message
  // stands in for it. Shown from the count read on the server, so the panel is
  // honest about the limit before spending a request to be told the same thing.
  const atLimit = rateLimit !== null && rateLimit.used >= rateLimit.limit;

  if (status === "rate_limited" || (status === "prompt" && atLimit && rateLimit !== null)) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
        {rateLimit === null ? (
          <p className="text-xs leading-relaxed">
            {COMMENTARY_FAILURE_MESSAGE.rate_limited}
          </p>
        ) : (
          <RateLimitNotice rateLimit={rateLimit} />
        )}
      </div>
    );
  }

  if (status === "prompt") {
    if (totalUserMoves === 0) {
      return (
        <p className="p-4 text-center text-xs leading-relaxed text-graphite">
          This game has none of your moves to analyse.
        </p>
      );
    }
    // British "analyses", and a small caption rather than a warning: the count
    // is there to inform, not to make the student ration the last one.
    const countSuffix =
      rateLimit === null ? "" : ` (${rateLimit.used} of ${rateLimit.limit} used today)`;
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
        <p className="text-xs leading-relaxed text-graphite">
          Generate the coach summary and commentary for this game. It stays saved, so this runs once.
        </p>
        <button
          type="button"
          disabled={!engine.isReady}
          onClick={generate}
          className="mx-auto rounded border border-rule-strong px-4 py-2 text-xs transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent"
        >
          {engine.isReady ? `Generate coach commentary${countSuffix}` : "Engine loading..."}
        </button>
      </div>
    );
  }

  if (status === "analyzing") {
    const percent =
      progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100);
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4">
        <p className="text-center text-xs text-graphite">
          Analysing move {progress.completed} of {progress.total}
        </p>
        <div className="h-1 w-full overflow-hidden rounded-sm bg-rule">
          <div className="h-full bg-info" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
        <p className="text-xs leading-relaxed">{error}</p>
        <RetryButton onClick={generate} className="mx-auto" />
      </div>
    );
  }

  const message = failure === null ? null : COMMENTARY_FAILURE_MESSAGE[failure];
  const pending = status === "generating";

  // With an analysis in hand the degraded view is worth keeping on screen
  // through all of this: the classifications are already reliable, and a retry
  // that blanked them would make the panel feel like it had lost the game.
  if (fallbackMoves.length > 0) {
    return (
      <CoachView
        notableMoves={[]}
        selectedPly={null}
        onSelect={onSelectPly}
        commentaryUnavailable
        fallbackMoves={fallbackMoves}
        unavailableMessage={message ?? undefined}
        retryPending={pending}
        onRetryCommentary={status === "refused" ? null : generate}
      />
    );
  }

  // No analysis to fall back on, so the panel is only these few words.
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
      <p className="text-xs leading-relaxed">
        {pending ? "Coach analysis in progress. This takes a moment." : message}
      </p>
      {status === "refused" ? null : (
        <RetryButton onClick={generate} pending={pending} className="mx-auto" />
      )}
    </div>
  );
}
