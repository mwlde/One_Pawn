"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Mirrors the message shapes in engine.worker.ts and docs/ARCHITECTURE.md,
// "Web Worker and WASM boundary". Duplicated rather than imported: importing
// from the worker file would pull its top-level `self as WorkerSelf` cast
// and `load()` call into any bundle that imports this hook, which is exactly
// the code that must only ever run inside the worker.
type FindBestMoveMessage = {
  type: "find_best_move";
  fen: string;
  depth: number;
  requestId: string;
};

type WorkerMessage =
  | { type: "best_move_result"; requestId: string; move: string }
  | { type: "error"; requestId: string; message: string }
  | { type: "ready" };

type PendingRequest = {
  resolve: (move: string) => void;
  reject: (error: Error) => void;
};

export function useEngine(): {
  isReady: boolean;
  getBestMove: (fen: string, depth: number) => Promise<string>;
} {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestsRef = useRef(new Map<string, PendingRequest>());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL("./engine.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === "ready") {
        setIsReady(true);
        return;
      }

      const pending = pendingRequestsRef.current.get(message.requestId);
      // A missing entry means the request already settled (or was never
      // ours), not an error: nothing to do.
      if (pending === undefined) return;

      pendingRequestsRef.current.delete(message.requestId);
      if (message.type === "error") {
        pending.reject(new Error(message.message));
      } else {
        pending.resolve(message.move);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Deliberately does not wait for isReady before posting: the worker queues
  // any find_best_move message that arrives before it has finished loading
  // WASM (see engine.worker.ts) and drains that queue itself once ready. Redoing
  // that queueing here would just be the same logic in two places. The one
  // case this function does guard is the worker not existing yet at all,
  // which would otherwise throw on workerRef.current.postMessage.
  const getBestMove = useCallback((fen: string, depth: number): Promise<string> => {
    const worker = workerRef.current;
    if (worker === null) {
      return Promise.reject(new Error("Engine worker is not available."));
    }

    const requestId = crypto.randomUUID();

    return new Promise<string>((resolve, reject) => {
      pendingRequestsRef.current.set(requestId, { resolve, reject });
      const message: FindBestMoveMessage = { type: "find_best_move", fen, depth, requestId };
      worker.postMessage(message);
    });
  }, []);

  return { isReady, getBestMove };
}
