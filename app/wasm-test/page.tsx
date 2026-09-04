"use client";

import { useEffect, useState } from "react";

import { useEngine } from "@/engine-wasm/useEngine";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const DEFAULT_DEPTH = 3;

// The race test needs two positions whose best moves genuinely differ, or it
// passes vacuously: if both searches answer the same move, a swapped pairing
// is indistinguishable from a correct one. This is the fool's-mate position,
// where black has a forced mate with the queen and the engine answers d8h4,
// against the starting position's b1c3.
const RACE_FEN = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";

export default function WasmTestPage() {
  const { isReady, getBestMove } = useEngine();

  const [autoResult, setAutoResult] = useState<string | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);

  const [fen, setFen] = useState(STARTING_FEN);
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [manualResult, setManualResult] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const [raceResult, setRaceResult] = useState<string | null>(null);

  // Fires once on mount, not gated on isReady: getBestMove is safe to call
  // before the engine reports ready (see useEngine.ts), so there is no
  // reason to wait. `cancelled` guards against setting state after unmount,
  // the same way the old direct-import version of this page did.
  useEffect(() => {
    let cancelled = false;

    getBestMove(STARTING_FEN, DEFAULT_DEPTH)
      .then((move) => {
        if (!cancelled) setAutoResult(move);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setAutoError(cause instanceof Error ? cause.message : String(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [getBestMove]);

  function handleManualSearch() {
    setManualError(null);
    setManualResult(null);
    getBestMove(fen, depth)
      .then((move) => setManualResult(move))
      .catch((cause: unknown) => setManualError(cause instanceof Error ? cause.message : String(cause)));
  }

  // Fires two requests back to back and reports both results together, so a
  // requestId mix-up (move A resolving as move B's answer) would show up as
  // an obviously wrong pairing rather than being lost in separate renders.
  function handleRaceTest() {
    setRaceResult("running...");
    Promise.all([getBestMove(STARTING_FEN, DEFAULT_DEPTH), getBestMove(RACE_FEN, DEFAULT_DEPTH)])
      .then(([first, second]) => {
        const swapped = first === "d8h4" && second === "b1c3";
        setRaceResult(
          `start pos: ${first} (expect b1c3), fool's mate: ${second} (expect d8h4)` +
            (swapped ? " [RESULTS SWAPPED]" : ""),
        );
      })
      .catch((cause: unknown) => {
        setRaceResult(`race test failed: ${cause instanceof Error ? cause.message : String(cause)}`);
      });
  }

  return (
    <main className="p-8 font-mono text-lg">
      <h1 className="mb-4 text-xl">Engine test</h1>
      <p className="mb-2 text-sm text-zinc-600">
        Diagnostic page for the useEngine hook. Not the game UI.
      </p>
      <p className="mb-6 text-sm">
        {isReady ? (
          <span className="text-green-700">Engine ready</span>
        ) : (
          <span className="text-zinc-600">Engine loading...</span>
        )}
      </p>

      <section className="mb-8">
        <h2 className="mb-2 font-bold">Auto-test: starting position, depth {DEFAULT_DEPTH}</h2>
        {autoError !== null ? (
          <p className="text-red-600">Engine error: {autoError}</p>
        ) : autoResult === null ? (
          <p>Waiting for engine...</p>
        ) : (
          <p>
            best move: <span className="font-bold">{autoResult}</span>
          </p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-bold">Manual search</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={fen}
            onChange={(event) => setFen(event.target.value)}
            className="w-full max-w-2xl border border-zinc-400 px-2 py-1"
            placeholder="paste a FEN"
          />
          <input
            type="number"
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
            className="w-20 border border-zinc-400 px-2 py-1"
            min={1}
            max={8}
            aria-label="search depth"
          />
          <button
            type="button"
            onClick={handleManualSearch}
            disabled={!isReady}
            className="border border-zinc-400 px-3 py-1 disabled:opacity-50"
          >
            Search
          </button>
        </div>
        {manualError !== null && <p className="mt-2 text-red-600">Engine error: {manualError}</p>}
        {manualResult !== null && (
          <p className="mt-2">
            best move: <span className="font-bold">{manualResult}</span>
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold">Request ID race test</h2>
        <p className="mb-2 text-sm text-zinc-600">
          Fires two getBestMove calls back to back, against two positions with different
          best moves, and checks neither result gets swapped or lost.
        </p>
        <button
          type="button"
          onClick={handleRaceTest}
          disabled={!isReady}
          className="border border-zinc-400 px-3 py-1 disabled:opacity-50"
        >
          Run race test
        </button>
        {raceResult !== null && <p className="mt-2">{raceResult}</p>}
      </section>
    </main>
  );
}
