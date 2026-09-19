"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CoachView } from "@/components/coach/CoachView";
import { useEngineContext } from "@/components/EngineProvider";
import { analyzeGame } from "@/lib/analysis/analyze-game";
import { fetchAnalysis, saveAnalysis, type StoredAnalysis } from "@/lib/analysis/client";
import { ANALYSIS_DEPTH } from "@/lib/analysis/types";
import { fetchCommentary, generateCommentary } from "@/lib/coach/client";
import { buildClassificationDisplay, buildNotableDisplay } from "@/lib/coach/display";
import type { GameCommentary } from "@/lib/coach/types";
import type { Side } from "@/lib/game/settings";

type CoachPanelProps = {
  gameId: string;
  pgn: string;
  userColor: Side;
  // From the replay: fens[p - 1] is the position ply p was played from.
  fens: string[];
  // SAN of each ply, zero-indexed: sanByPly[p - 1] is ply p.
  sanByPly: string[];
  onSelectPly: (ply: number) => void;
};

// The coach view for a game opened from the profile. A Coach-mode game usually
// has its analysis and commentary saved from the moment it finished, so the
// common path is a plain load and display. The generate path covers the rest: a
// game whose commentary failed at the time (retry), or one saved before it
// finished analysing (rare).
type Status =
  | "loading"
  | "ready"
  | "prompt"
  | "analyzing"
  | "generating"
  | "unavailable"
  | "error";

function countUserMoves(totalPlies: number, userColor: Side): number {
  return userColor === "white" ? Math.ceil(totalPlies / 2) : Math.floor(totalPlies / 2);
}

export function CoachPanel({ gameId, pgn, userColor, fens, sanByPly, onSelectPly }: CoachPanelProps) {
  const engine = useEngineContext();

  const [status, setStatus] = useState<Status>("loading");
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [commentary, setCommentary] = useState<GameCommentary | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const totalUserMoves = useMemo(
    () => countUserMoves(sanByPly.length, userColor),
    [sanByPly.length, userColor],
  );

  // On mount, load whatever is already saved: the analysis and the commentary.
  // Commentary present is the common case and shows straight away. Otherwise the
  // panel offers to generate it.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAnalysis(gameId), fetchCommentary(gameId)])
      .then(([storedAnalyses, storedCommentary]) => {
        if (cancelled) return;
        setAnalyses(storedAnalyses);
        if (storedCommentary.summary !== null || storedCommentary.moves.length > 0) {
          setCommentary(storedCommentary);
          setStatus("ready");
        } else {
          setStatus("prompt");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("prompt");
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const generate = useCallback(async () => {
    setError(null);

    let currentAnalyses = analyses;
    try {
      // Run the engine only if the analysis is not already saved. Revisiting a
      // game whose commentary failed should not pay for the analysis again.
      if (currentAnalyses.length === 0) {
        setStatus("analyzing");
        setProgress({ completed: 0, total: totalUserMoves });
        const computed = await analyzeGame(pgn, userColor, engine, ANALYSIS_DEPTH, (completed, total) => {
          if (activeRef.current) setProgress({ completed, total });
        });
        if (computed.length === 0) {
          if (!activeRef.current) return;
          setStatus("ready");
          return;
        }
        currentAnalyses = await saveAnalysis(gameId, computed);
        if (!activeRef.current) return;
        setAnalyses(currentAnalyses);
      }
    } catch (cause) {
      if (!activeRef.current) return;
      setError(cause instanceof Error ? cause.message : "The analysis could not be completed.");
      setStatus("error");
      return;
    }

    setStatus("generating");
    const result = await generateCommentary(gameId);
    if (!activeRef.current) return;
    setCommentary(result.commentary);
    setStatus(result.failed ? "unavailable" : "ready");
  }, [analyses, engine, gameId, pgn, totalUserMoves, userColor]);

  const notableMoves = useMemo(() => {
    if (commentary === null) return [];
    return buildNotableDisplay(commentary.moves, analyses, fens, sanByPly);
  }, [commentary, analyses, fens, sanByPly]);

  const fallbackMoves = useMemo(
    () => buildClassificationDisplay(analyses, fens, sanByPly),
    [analyses, fens, sanByPly],
  );

  if (status === "loading") {
    return <p className="p-4 text-[11px] text-muted">Loading coach...</p>;
  }

  if (status === "prompt") {
    if (totalUserMoves === 0) {
      return (
        <p className="p-4 text-center text-xs leading-relaxed text-muted">
          This game has none of your moves to analyse.
        </p>
      );
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
        <p className="text-xs leading-relaxed text-muted">
          Generate the coach summary and commentary for this game. It stays saved, so this runs once.
        </p>
        <button
          type="button"
          disabled={!engine.isReady}
          onClick={generate}
          className="mx-auto border border-ink px-4 py-2 font-mono text-xs hover:bg-tint disabled:cursor-not-allowed disabled:border-hairline disabled:text-hairline disabled:hover:bg-transparent"
        >
          {engine.isReady ? "Generate coach commentary" : "Engine loading..."}
        </button>
      </div>
    );
  }

  if (status === "analyzing") {
    const percent =
      progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100);
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4">
        <p className="text-center font-mono text-[11px] text-muted">
          Analysing move {progress.completed} of {progress.total}
        </p>
        <div className="h-2 w-full border border-hairline">
          <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  if (status === "generating") {
    return (
      <p className="flex min-h-0 flex-1 items-center justify-center p-4 font-mono text-[11px] text-muted">
        Coach is thinking...
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
        <p className="text-xs leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={generate}
          className="mx-auto border border-ink px-4 py-2 font-mono text-xs hover:bg-tint"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <CoachView
      summary={commentary?.summary ?? null}
      notableMoves={notableMoves}
      commentaryUnavailable={status === "unavailable"}
      fallbackMoves={fallbackMoves}
      onRetryCommentary={generate}
      onSelectPly={onSelectPly}
    />
  );
}
