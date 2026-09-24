"use client";

import { useEffect, useState } from "react";

import { useEngineContext } from "@/components/EngineProvider";
import { analyzeGame } from "@/lib/analysis/analyze-game";
import { summarizeUserMoves, type GameStatsSummary } from "@/lib/analysis/summary";
import { ANALYSIS_DEPTH } from "@/lib/analysis/types";
import type { SaveGamePayload } from "@/lib/game/save";

export type PlayStats =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "ready"; stats: GameStatsSummary }
  | { status: "error" };

type Result = { payload: SaveGamePayload; stats: GameStatsSummary | null };

// The post-game counts for a Play-mode game: the same local engine pass Coach
// mode runs, without the save or the commentary. Nothing is written, so it
// works for a guest as well. Coach mode keeps its own pipeline.
//
// The result is keyed to the payload it was computed for, so a rematch never
// shows the previous game's numbers while its own pass is still running.
export function usePlayStats(payload: SaveGamePayload | null, enabled: boolean): PlayStats {
  const engine = useEngineContext();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled || payload === null) return;
    let cancelled = false;

    analyzeGame(payload.pgn, payload.user_color, engine, ANALYSIS_DEPTH)
      .then((analyses) => {
        if (!cancelled) setResult({ payload, stats: summarizeUserMoves(analyses) });
      })
      .catch(() => {
        if (!cancelled) setResult({ payload, stats: null });
      });

    return () => {
      cancelled = true;
    };
  }, [payload, enabled, engine]);

  if (!enabled || payload === null) return { status: "idle" };
  if (result === null || result.payload !== payload) return { status: "analyzing" };
  return result.stats === null ? { status: "error" } : { status: "ready", stats: result.stats };
}
