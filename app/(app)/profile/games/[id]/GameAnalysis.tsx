"use client";

import { Chess } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";

import { useEngineContext } from "@/components/EngineProvider";
import { analyzeGame } from "@/lib/analysis/analyze-game";
import { fetchAnalysis, saveAnalysis, type StoredAnalysis } from "@/lib/analysis/client";
import { CLASSIFICATION_DISPLAY, formatMoveLabel } from "@/lib/analysis/display";
import { ANALYSIS_DEPTH } from "@/lib/analysis/types";
import { parseEngineMove } from "@/lib/game/engine-move";
import { formatPlayedAt } from "@/lib/game/history";
import type { Side } from "@/lib/game/settings";

type GameAnalysisProps = {
  gameId: string;
  pgn: string;
  userColor: Side;
  // From the replay: fens[0] is the starting position and fens[p] is the
  // position after ply p, so fens[p - 1] is the position ply p was played from.
  fens: string[];
  // SAN of each ply, indexed from zero: sanByPly[p - 1] is ply p.
  sanByPly: string[];
  // Jumps the board to the position after the given 1-indexed ply.
  onSelectPly: (ply: number) => void;
};

type Status = "loading" | "empty" | "analyzing" | "ready" | "error";

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
  fens,
  sanByPly,
  onSelectPly,
}: GameAnalysisProps) {
  const engine = useEngineContext();

  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<StoredAnalysis[]>([]);
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loadNote, setLoadNote] = useState<string | null>(null);

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

  // On mount, load any stored analysis. Empty is a normal answer: the game has
  // not been analysed yet, so the Analyse button is shown. A failed load is not
  // fatal either: the button still works, and a note explains what happened.
  useEffect(() => {
    let cancelled = false;
    fetchAnalysis(gameId)
      .then((moves) => {
        if (cancelled) return;
        if (moves.length > 0) {
          setRows(moves);
          setCached(true);
          setStatus("ready");
        } else {
          setStatus("empty");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLoadNote("Saved analysis could not be loaded. You can still analyse the game.");
        setStatus("empty");
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  async function run() {
    setStatus("analyzing");
    setError(null);
    setLoadNote(null);
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

  if (status === "loading") {
    return <p className="p-4 text-[11px] text-muted">Loading analysis...</p>;
  }

  if (status === "empty") {
    // A game can be saved with none of the user's moves in it (resigning right
    // after the opponent's first move, say). There is nothing to analyse, so
    // the button would only lead to a failed save.
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
          Run the engine over your moves to see where the game turned. Analysis stays saved, so
          this only runs once.
        </p>
        <button
          type="button"
          disabled={!engine.isReady}
          onClick={run}
          className="mx-auto border border-ink px-4 py-2 font-mono text-xs hover:bg-tint disabled:cursor-not-allowed disabled:border-hairline disabled:text-hairline disabled:hover:bg-transparent"
        >
          {engine.isReady ? "Analyse this game" : "Engine loading..."}
        </button>
        {loadNote === null ? null : <p className="text-[10px] text-muted">{loadNote}</p>}
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
        <p className="text-center text-[10px] text-muted">
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
          className="mx-auto border border-ink px-4 py-2 font-mono text-xs hover:bg-tint"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-dashed border-hairline px-3 py-2 font-mono text-[10px] text-muted">
        <span>{rows.length === 1 ? "1 of your moves" : `${rows.length} of your moves`}</span>
        <span>
          {cached && rows[0] !== undefined
            ? `cached · ${formatPlayedAt(rows[0].created_at)}`
            : "just analysed"}
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {display.map((move) => (
          <li key={move.ply} className="border-b border-dashed border-hairline last:border-b-0">
            <button
              type="button"
              onClick={() => onSelectPly(move.ply)}
              className="w-full px-3 py-2 text-left hover:bg-tint"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px]">{move.label}</span>
                <span
                  className={`shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${CLASSIFICATION_DISPLAY[move.classification].badge}`}
                >
                  {CLASSIFICATION_DISPLAY[move.classification].label}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-muted">
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
