"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useEngineContext } from "@/components/EngineProvider";
import { analyzeGame } from "@/lib/analysis/analyze-game";
import { saveAnalysis, type StoredAnalysis } from "@/lib/analysis/client";
import { ANALYSIS_DEPTH } from "@/lib/analysis/types";
import { generateCommentary } from "@/lib/coach/client";
import type { GameCommentary } from "@/lib/coach/types";
import type { Side } from "@/lib/game/settings";

// The automatic coach pipeline for a finished Coach-mode game: run the engine
// over the user's moves, save the analysis, then ask the server for commentary.
// The play screen starts this once a game has been saved (the commentary route
// keys off the saved game's id).
//
// Two failures are handled differently. If the engine analysis or its save
// fails, the phase is "error" and nothing is shown: there is nothing reliable to
// show yet, so the user retries the whole pass. If only the Groq commentary
// fails, the phase is still "ready" with commentaryFailed set: the
// classifications are computed and reliable, so they are shown with a retry for
// the commentary alone. This is the graceful-degradation split from the brief.

export type CoachPhase = "idle" | "analyzing" | "commentating" | "ready" | "error";

export type CoachAnalysis = {
  phase: CoachPhase;
  progress: { completed: number; total: number };
  analyses: StoredAnalysis[];
  commentary: GameCommentary | null;
  // The summary could not be generated, but the analysis is present.
  commentaryFailed: boolean;
  error: string | null;
  start: (gameId: string, pgn: string, userColor: Side) => void;
  retryAnalysis: (gameId: string, pgn: string, userColor: Side) => void;
  retryCommentary: (gameId: string) => void;
};

export function useCoachAnalysis(): CoachAnalysis {
  const engine = useEngineContext();

  const [phase, setPhase] = useState<CoachPhase>("idle");
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [commentary, setCommentary] = useState<GameCommentary | null>(null);
  const [commentaryFailed, setCommentaryFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A pass in flight when the component unmounts must not set state afterwards.
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  // The game a pass has already been started for, so a re-render of the play
  // screen cannot kick off a second engine run for the same game. Cleared on a
  // failure so a retry can run again.
  const startedRef = useRef<string | null>(null);

  const runCommentary = useCallback(async (gameId: string) => {
    setPhase("commentating");
    setCommentaryFailed(false);
    const result = await generateCommentary(gameId);
    if (!activeRef.current) return;
    setCommentary(result.commentary);
    setCommentaryFailed(result.failed);
    setPhase("ready");
  }, []);

  const start = useCallback(
    async (gameId: string, pgn: string, userColor: Side) => {
      if (startedRef.current === gameId) return;
      startedRef.current = gameId;

      setPhase("analyzing");
      setError(null);
      setCommentary(null);
      setCommentaryFailed(false);
      setAnalyses([]);
      setProgress({ completed: 0, total: 0 });

      let stored: StoredAnalysis[];
      try {
        const computed = await analyzeGame(pgn, userColor, engine, ANALYSIS_DEPTH, (completed, total) => {
          if (activeRef.current) setProgress({ completed, total });
        });

        // A game with none of the user's moves has nothing to analyse or explain.
        // Reach "ready" with empty results rather than sending an empty analysis
        // to a save route that rejects it.
        if (computed.length === 0) {
          if (!activeRef.current) return;
          setAnalyses([]);
          setPhase("ready");
          return;
        }

        stored = await saveAnalysis(gameId, computed);
      } catch (cause) {
        if (!activeRef.current) return;
        setError(cause instanceof Error ? cause.message : "The analysis could not be completed.");
        setPhase("error");
        startedRef.current = null;
        return;
      }

      if (!activeRef.current) return;
      setAnalyses(stored);
      await runCommentary(gameId);
    },
    [engine, runCommentary],
  );

  const retryAnalysis = useCallback(
    (gameId: string, pgn: string, userColor: Side) => {
      startedRef.current = null;
      void start(gameId, pgn, userColor);
    },
    [start],
  );

  const retryCommentary = useCallback(
    (gameId: string) => {
      void runCommentary(gameId);
    },
    [runCommentary],
  );

  return {
    phase,
    progress,
    analyses,
    commentary,
    commentaryFailed,
    error,
    start,
    retryAnalysis,
    retryCommentary,
  };
}
