"use client";

import { useEffect, useState } from "react";

type EngineModule = {
  _add: (a: number, b: number) => number;
};

type EngineFactory = () => Promise<EngineModule>;

const ENGINE_PATH = "/engine.js";

export default function WasmTestPage() {
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loaded: { default: EngineFactory } = await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ ENGINE_PATH
        );
        const engine = await loaded.default();
        if (!cancelled) {
          setResult(engine._add(2, 3));
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="p-8 font-mono text-lg">
      <h1 className="mb-4 text-xl">WASM test</h1>
      {error !== null ? (
        <p className="text-red-600">Engine failed to load: {error}</p>
      ) : result === null ? (
        <p>Loading engine...</p>
      ) : (
        <p>
          add(2, 3) = <span className="font-bold">{result}</span>
        </p>
      )}
    </main>
  );
}
