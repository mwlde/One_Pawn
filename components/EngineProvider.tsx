"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useEngine } from "@/engine-wasm/useEngine";

type EngineContextValue = {
  isReady: boolean;
  getBestMove: (fen: string, depth: number) => Promise<string>;
};

const EngineContext = createContext<EngineContextValue | null>(null);

// Every call to useEngine spawns its own Worker, and the app needs the engine in
// two places at once: the nav's readiness indicator and the game screen. Calling
// the hook twice would download and instantiate the WASM module twice for no
// benefit, so it is called once here and shared. Context is the state pattern
// this project already commits to (docs/ARCHITECTURE.md, "State management").
export function EngineProvider({ children }: { children: ReactNode }) {
  const { isReady, getBestMove } = useEngine();

  const value = useMemo(() => ({ isReady, getBestMove }), [isReady, getBestMove]);

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngineContext(): EngineContextValue {
  const value = useContext(EngineContext);
  if (value === null) {
    throw new Error("useEngineContext must be used inside an EngineProvider.");
  }
  return value;
}
