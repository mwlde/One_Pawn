"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Mirrors the message shapes in engine.worker.ts and docs/ARCHITECTURE.md,
// "Web Worker and WASM boundary". Duplicated rather than imported: importing
// from the worker file would pull its top-level `self as WorkerSelf` cast
// and `load()` call into any bundle that imports this hook, which is exactly
// the code that must only ever run inside the worker.
type RequestMessage = {
  type: "find_best_move" | "evaluate_position";
  fen: string;
  depth: number;
  requestId: string;
};

type WorkerMessage =
  | { type: "best_move_result"; requestId: string; move: string }
  | { type: "evaluate_position_result"; requestId: string; score: number }
  | { type: "error"; requestId: string; message: string }
  | { type: "ready" };

// A single pending map serves both request kinds, so its value is the union of
// what either can resolve to. The public methods narrow that back to the one
// type their request can actually produce (see getBestMove/evaluatePosition),
// which also catches a reply of the wrong shape rather than trusting it.
type PendingRequest = {
  resolve: (value: string | number) => void;
  reject: (error: Error) => void;
};

export function useEngine(): {
  isReady: boolean;
  getBestMove: (fen: string, depth: number) => Promise<string>;
  evaluatePosition: (fen: string, depth: number) => Promise<number>;
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
      } else if (message.type === "best_move_result") {
        pending.resolve(message.move);
      } else {
        pending.resolve(message.score);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Deliberately does not wait for isReady before posting: the worker queues
  // any request that arrives before it has finished loading WASM (see
  // engine.worker.ts) and drains that queue itself once ready. Redoing that
  // queueing here would just be the same logic in two places. The one case
  // this function does guard is the worker not existing yet at all, which
  // would otherwise throw on workerRef.current.postMessage.
  const send = useCallback(
    (type: RequestMessage["type"], fen: string, depth: number): Promise<string | number> => {
      const worker = workerRef.current;
      if (worker === null) {
        return Promise.reject(new Error("Engine worker is not available."));
      }

      const requestId = crypto.randomUUID();

      return new Promise<string | number>((resolve, reject) => {
        pendingRequestsRef.current.set(requestId, { resolve, reject });
        const message: RequestMessage = { type, fen, depth, requestId };
        worker.postMessage(message);
      });
    },
    [],
  );

  const getBestMove = useCallback(
    (fen: string, depth: number): Promise<string> =>
      send("find_best_move", fen, depth).then((value) => {
        // A number here would mean the worker crossed the wires on a reply.
        // Guard rather than cast, so a protocol bug surfaces as a rejection
        // the caller can show instead of a "move" that is really a score.
        if (typeof value !== "string") {
          throw new Error("Engine returned a score where a move was expected.");
        }
        return value;
      }),
    [send],
  );

  const evaluatePosition = useCallback(
    (fen: string, depth: number): Promise<number> =>
      send("evaluate_position", fen, depth).then((value) => {
        if (typeof value !== "number") {
          throw new Error("Engine returned a move where a score was expected.");
        }
        return value;
      }),
    [send],
  );

  return { isReady, getBestMove, evaluatePosition };
}
