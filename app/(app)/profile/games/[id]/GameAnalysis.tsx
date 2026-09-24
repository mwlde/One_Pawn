"use client";

import { Chess } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";

import { useEngineContext } from "@/components/EngineProvider";
import { analyzeGame } from "@/lib/analysis/analyze-game";
import { saveAnalysis, type StoredAnalysis } from "@/lib/analysis/client";
import { CLASSIFICATION_DISPLAY, formatMoveLabel } from "@/lib/analysis/display";
import { ANALYSIS_DEPTH } from "@/lib/analysis/types";
import { parseEngineMove } from "@/lib/game/engine-move";
import { formatPlayedAt } from "@/lib/game/history";
import type { Side } from "@/lib/game/settings";

type GameAnalysisProps = {
  gameId: string;
  pgn: string;
  userColor: Side;
  // Whatever the page read on the server. Empty means the game has not been
  // analysed, which is the normal state and what the Analyse button is for.
  initialAnalyses: StoredAnalysis[];
  // From the replay: fens[0] is the starting position and fens[p] is the
  // position after ply p, so fens[p - 1] is the position ply p was played from.
  fens: string[];
  // SAN of each ply, indexed from zero: sanByPly[p - 1] is ply p.
  sanByPly: string[];
  // A fresh analysis goes back to the replay screen, which puts the
  // classification marks on the move list.
  onAnalyses: (rows: StoredAnalysis[]) => void;
  // Jumps the board to the position after the given 1-indexed ply.
  onSelectPly: (ply: number) => void;
};

type Status = "empty" | "analyzing" | "ready" | "error";

// The engine's best move, rendered as SAN for the position it was played from.
// Returns null for anything unreadable, so a stray row falls back to the raw
// UCI rather than throwing while the table renders.
function toSan(fenBefore: string, uci: string): string | null {
  const parsed = parseEngineMove(uci);
  if (parsed === null) return null;
  const chess = new Chess(fenBefore);
  try {
    return chess.move(parsed).san;
  } catch {
    return null;
  }
}

// Total user moves in the game, so the progress bar has a denominator before
// the first ply is searched. Whites are the odd plies (1-indexed), Blacks the
// even, so the count is a straight halving of the total either way.
function countUserMoves(totalPlies: number, userColor: Side): number {
  return userColor === "white" ? Math.ceil(totalPlies / 2) : Math.floor(totalPlies / 2);
}

export function GameAnalysis({
  gameId,
  pgn,
  userColor,
  initialAnalyses,
  fens,
  sanByPly,
  onAnalyses,
  onSelectPly,
}: GameAnalysisProps) {
  const engine = useEngineContext();

  const [status, setStatus] = useState<Status>(initialAnalyses.length > 0 ? "ready" : "empty");
  const [rows, setRows] = useState(initialAnalyses);
  // Whether the rows on screen came out of the database rather than out of the
  // engine a moment ago. The page reads them on the server now, so the first
  // render of an analysed game is always the cached one.
  const [cached, setCached] = useState(initialAnalyses.length > 0);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const totalUserMoves = useMemo(
    () => countUserMoves(sanByPly.length, userColor),
    [sanByPly.length, userColor],
  );

  // A run in flight when the component unmounts must not set state afterwards.
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  async function run() {
    setStatus("analyzing");
    setError(null);
    setProgress({ completed: 0, total: totalUserMoves });

    try {
      const computed = await analyzeGame(
        pgn,
        userColor,
        engine,
        ANALYSIS_DEPTH,
        (completed, total) => {
          if (activeRef.current) setProgress({ completed, total });
        },
      );
      const stored = await saveAnalysis(gameId, computed);
      if (!activeRef.current) return;
      setRows(stored);
      setCached(false);
      setStatus("ready");
      onAnalyses(stored);
    } catch (cause) {
      if (!activeRef.current) return;
      setError(cause instanceof Error ? cause.message : "The analysis could not be completed.");
      setStatus("error");
    }
  }

  const display = useMemo(
    () =>
      rows.map((row) => {
        const fenBefore = fens[row.ply - 1] ?? "";
        const playedSan = sanByPly[row.ply - 1] ?? row.move_uci;
        const playedBest = row.engine_best_uci === row.move_uci;
        const bestSan = playedBest ? null : (toSan(fenBefore, row.engine_best_uci) ?? row.engine_best_uci);
        return {
          ply: row.ply,
          label: formatMoveLabel(row.ply, playedSan),
          classification: row.classification,
          evalLoss: row.eval_loss,
          bestSan,
        };
      }),
    [rows, fens, sanByPly],
  );

  if (status === "empty") {
    // A game can be saved with none of the user's moves in it (resigning right
    // after the opponent's first move, say). There is nothing to analyse, so
    // the button would only lead to a failed save.
    if (totalUserMoves === 0) {
      return (
        <p className="p-4 text-center text-xs leading-relaxed text-graphite">
          This game has none of your moves to analyse.
        </p>
      );
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
        <p className="text-xs leading-relaxed text-graphite">
          Run the engine over your moves to see where the game turned. Analysis stays saved, so
          this only runs once.
        </p>
        <button
          type="button"
          disabled={!engine.isReady}
          onClick={run}
          className="mx-auto rounded border border-rule-strong px-4 py-2 text-xs transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent"
        >
          {engine.isReady ? "Analyse this game" : "Engine loading..."}
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
        <p className="text-center text-xs text-graphite">
          The board stays usable while this runs.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 p-4 text-center">
        <p className="text-xs leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={run}
          className="mx-auto rounded border border-rule-strong px-4 py-2 text-xs transition-colors hover:bg-surface-sunk disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-rule px-3 py-2 text-xs text-graphite">
        <span>{rows.length === 1 ? "1 of your moves" : `${rows.length} of your moves`}</span>
        <span>
          {cached && rows[0] !== undefined
            ? `Cached · ${formatPlayedAt(rows[0].created_at)}`
            : "Just analysed"}
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {display.map((move) => (
          <li key={move.ply} className="border-b border-rule last:border-b-0">
            <button
              type="button"
              onClick={() => onSelectPly(move.ply)}
              className="w-full px-3 py-2 text-left transition-colors hover:bg-surface-sunk"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs">{move.label}</span>
                <span
                  className={`shrink-0 border px-2 py-1 text-xs uppercase tracking-wide ${CLASSIFICATION_DISPLAY[move.classification].badge}`}
                >
                  {CLASSIFICATION_DISPLAY[move.classification].label}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 font-mono text-xs text-graphite">
                <span>{move.bestSan === null ? "engine's choice" : `best ${move.bestSan}`}</span>
                <span>{move.evalLoss > 0 ? `-${move.evalLoss} cp` : "0 cp"}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
