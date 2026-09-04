"use client";

import { useEffect, useRef, useState } from "react";

// The subset of the Emscripten module object this page actually uses.
// cwrap's real signature is generic over its type-tag strings; typing that
// precisely would need overloads for every combination this file does not
// call, so it is left loose here and the three wrapped functions below are
// cast to their real signatures at the one place each is created.
type EngineModule = {
  cwrap: (
    name: string,
    returnType: string,
    argTypes: string[],
  ) => (...args: unknown[]) => unknown;
};

type EngineFactory = () => Promise<EngineModule>;

const ENGINE_PATH = "/engine.js";
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SEARCH_DEPTH = 3;

// The three shim functions, wrapped for JS. See engine/src/wasm_api.cpp for
// the contract: engineGetBestMove returns "" (cwrap turns its NULL into an
// empty string, it does not hand back null) when the search failed, and
// engineHasError is what actually says so.
type Engine = {
  getBestMove: (fen: string, depth: number) => string;
  getError: () => string;
  hasError: () => number;
};

function wrapEngine(module: EngineModule): Engine {
  return {
    getBestMove: module.cwrap("engineGetBestMove", "string", ["string", "number"]) as (
      fen: string,
      depth: number,
    ) => string,
    getError: module.cwrap("engineGetError", "string", []) as () => string,
    hasError: module.cwrap("engineHasError", "number", []) as () => number,
  };
}

// Runs one search and reads back either the move or the shim's error message.
// Shared by the auto-test and the manual form, since both are "call the
// engine, then check hasError()" and nothing else.
function search(engine: Engine, fen: string, depth: number): { move: string } | { error: string } {
  const move = engine.getBestMove(fen, depth);
  if (engine.hasError()) {
    return { error: engine.getError() };
  }
  return { move };
}

export default function WasmTestPage() {
  // The engine itself lives in a ref, not state: it is a mutable handle used
  // inside an event handler, not a value the render needs to read. Whether it
  // is ready to use *is* a render concern, so that part is separate state.
  const engineRef = useRef<Engine | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [autoResult, setAutoResult] = useState<string | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);

  const [fen, setFen] = useState(STARTING_FEN);
  const [manualResult, setManualResult] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loaded: { default: EngineFactory } = await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ ENGINE_PATH
        );
        const engineModule = await loaded.default();
        const engine = wrapEngine(engineModule);
        if (cancelled) return;

        engineRef.current = engine;
        setEngineReady(true);

        const outcome = search(engine, STARTING_FEN, SEARCH_DEPTH);
        if ("error" in outcome) setAutoError(outcome.error);
        else setAutoResult(outcome.move);
      } catch (cause) {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleManualSearch() {
    const engine = engineRef.current;
    if (engine === null) return;

    const outcome = search(engine, fen, SEARCH_DEPTH);
    if ("error" in outcome) {
      setManualError(outcome.error);
      setManualResult(null);
    } else {
      setManualResult(outcome.move);
      setManualError(null);
    }
  }

  return (
    <main className="p-8 font-mono text-lg">
      <h1 className="mb-4 text-xl">Engine test</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Diagnostic page for the WASM engine boundary. Not the game UI.
      </p>

      <section className="mb-8">
        <h2 className="mb-2 font-bold">Auto-test: starting position, depth {SEARCH_DEPTH}</h2>
        {loadError !== null ? (
          <p className="text-red-600">Engine failed to load: {loadError}</p>
        ) : autoError !== null ? (
          <p className="text-red-600">Engine error: {autoError}</p>
        ) : autoResult === null ? (
          <p>Loading engine...</p>
        ) : (
          <p>
            best move: <span className="font-bold">{autoResult}</span>
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold">Manual search, depth {SEARCH_DEPTH}</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={fen}
            onChange={(event) => setFen(event.target.value)}
            className="w-full max-w-2xl border border-zinc-400 px-2 py-1"
            placeholder="paste a FEN"
          />
          <button
            type="button"
            onClick={handleManualSearch}
            disabled={!engineReady}
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
    </main>
  );
}
