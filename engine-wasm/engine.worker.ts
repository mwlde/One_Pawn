// Web Worker hosting the WASM engine. See docs/ARCHITECTURE.md, "Web Worker
// and WASM boundary", for why this exists: a synchronous engine call at
// depth 6+ is slow enough to freeze the main thread, so the call has to
// happen somewhere else entirely.
//
// This file only speaks the message protocol documented there. useEngine.ts
// is the other half.

// Same shape as the wasm-test page's EngineModule/EngineFactory: the subset
// of the Emscripten module this file actually touches. See
// app/wasm-test/page.tsx for why cwrap is typed loosely here and cast at the
// point each wrapped function is created.
type EngineModule = {
  cwrap: (
    name: string,
    returnType: string,
    argTypes: string[],
  ) => (...args: unknown[]) => unknown;
};

type EngineFactory = () => Promise<EngineModule>;

type Engine = {
  getBestMove: (fen: string, depth: number) => string;
  getError: () => string;
  hasError: () => number;
};

type FindBestMoveMessage = {
  type: "find_best_move";
  fen: string;
  depth: number;
  requestId: string;
};

type BestMoveResultMessage = {
  type: "best_move_result";
  requestId: string;
  move: string;
};

type ErrorMessage = {
  type: "error";
  requestId: string;
  message: string;
};

type ReadyMessage = {
  type: "ready";
};

const ENGINE_PATH = "/engine.js";

// The project's tsconfig uses the "dom" lib (Window, not WorkerGlobalScope),
// since the rest of the app is browser main-thread code and TypeScript will
// not let a program mix "dom" and "webworker" libs (they both declare a
// conflicting global `self`). Adding a second tsconfig just for this one
// file would be a new build pattern, so instead this narrows `self` to the
// tiny slice of the real DedicatedWorkerGlobalScope API this file uses.
// MessageEvent itself still comes from "dom" unchanged: it is the same type
// on both sides of a postMessage call.
type WorkerSelf = {
  postMessage: (message: BestMoveResultMessage | ErrorMessage | ReadyMessage) => void;
  onmessage: ((event: MessageEvent<FindBestMoveMessage>) => void) | null;
};

const workerSelf = self as unknown as WorkerSelf;

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

let engine: Engine | null = null;

// Messages that arrive before the WASM module has finished loading are
// queued here rather than dropped. The main thread has no way to know when
// "ready" fires, so it is free to post find_best_move the moment it creates
// the worker; this queue is what makes that safe.
const pendingMessages: FindBestMoveMessage[] = [];

function handleFindBestMove(engine: Engine, message: FindBestMoveMessage): void {
  const { fen, depth, requestId } = message;

  const move = engine.getBestMove(fen, depth);
  if (engine.hasError()) {
    const result: ErrorMessage = { type: "error", requestId, message: engine.getError() };
    workerSelf.postMessage(result);
    return;
  }

  const result: BestMoveResultMessage = { type: "best_move_result", requestId, move };
  workerSelf.postMessage(result);
}

workerSelf.onmessage = (event: MessageEvent<FindBestMoveMessage>) => {
  const message = event.data;

  if (engine === null) {
    pendingMessages.push(message);
    return;
  }

  dispatch(engine, message);
};

function dispatch(engine: Engine, message: FindBestMoveMessage): void {
  // The engine boundary already turns its own failures into hasError() plus
  // a message (see wasm_api.cpp). This try/catch is for the class of failure
  // that boundary cannot cover: a JS-level exception from cwrap or the glue
  // code itself (e.g. a malformed message reaching the engine call in a way
  // that throws before hasError has anything to report). Without it, a
  // thrown error here would kill the worker silently and every request after
  // it would hang forever with no response.
  try {
    handleFindBestMove(engine, message);
  } catch {
    const result: ErrorMessage = {
      type: "error",
      requestId: message.requestId,
      message: "Engine call failed unexpectedly.",
    };
    workerSelf.postMessage(result);
  }
}

async function load(): Promise<void> {
  const loaded: { default: EngineFactory } = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ ENGINE_PATH
  );
  const engineModule = await loaded.default();
  engine = wrapEngine(engineModule);

  const ready: ReadyMessage = { type: "ready" };
  workerSelf.postMessage(ready);

  for (const message of pendingMessages) {
    dispatch(engine, message);
  }
  pendingMessages.length = 0;
}

// If the WASM module itself fails to load, there is no requestId to reply
// to and no protocol message for "the worker never became ready". The hook
// on the other side would otherwise hang on isReady forever with no signal
// at all, so this at least surfaces the failure where a developer will see
// it (the worker's own console), rather than swallowing it.
load().catch((cause: unknown) => {
  console.error("engine.worker: failed to load WASM module", cause);
});
