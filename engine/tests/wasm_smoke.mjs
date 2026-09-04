// Sanity check for the wasm_api.cpp shim, run through Node instead of a
// browser. Emscripten's ES6 module output (MODULARIZE=1, EXPORT_ES6=1) is
// plain JavaScript once built, and Node can load and execute WASM just as a
// browser does, so this is enough to catch a broken shim before B2 wires up
// anything browser-side.
//
// Not a Vitest suite: this exercises a build artifact (public/engine.js),
// not source the project's test runner compiles, and it needs to run after
// engine/build.sh rather than alongside `npm test`. Run directly:
//
//   node engine/tests/wasm_smoke.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import createModule from "../../public/engine.js";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// The 20 legal moves White has from the starting position, in the long
// algebraic form moveToString produces (see move.h). Independent of the
// engine's own move generator: this list was written by hand, so a shim bug
// that always returns the same wrong square, say, cannot pass by agreeing
// with itself.
const LEGAL_STARTING_MOVES = new Set([
  "a2a3", "a2a4", "b2b3", "b2b4", "c2c3", "c2c4", "d2d3", "d2d4",
  "e2e3", "e2e4", "f2f3", "f2f4", "g2g3", "g2g4", "h2h3", "h2h4",
  "b1a3", "b1c3", "g1f3", "g1h3",
]);

let failures = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ok  - ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL - ${label}${detail ? `: ${detail}` : ""}`);
  }
}

// build.sh sets ENVIRONMENT=web, so the generated loader fetches engine.wasm
// over HTTP - the right choice for a browser, and Cloudflare Pages, but not
// something plain `node script.mjs` can do against a local file. Passing
// instantiateWasm sidesteps that: it is Emscripten's hook for supplying the
// compiled module ourselves, so this reads the .wasm bytes with Node's fs
// and hands them to WebAssembly.instantiate directly, without touching
// build.sh or its web-only ENVIRONMENT setting.
const wasmPath = fileURLToPath(new URL("../../public/engine.wasm", import.meta.url));
const wasmBinary = readFileSync(wasmPath);

const Module = await createModule({
  async instantiateWasm(imports, successCallback) {
    const { instance } = await WebAssembly.instantiate(wasmBinary, imports);
    successCallback(instance);
  },
});

// cwrap's 'string' return type calls UTF8ToString on the returned pointer,
// and UTF8ToString(0) is "" rather than null (checked directly in the built
// engine.js). So a NULL from engineGetBestMove arrives here as an empty
// string, not as null/undefined - engineHasError() is what actually tells a
// caller the call failed. That distinction is the whole reason the error
// path below checks hasError() rather than testing the move string alone.
const engineGetBestMove = Module.cwrap("engineGetBestMove", "string", ["string", "number"]);
const engineGetError = Module.cwrap("engineGetError", "string", []);
const engineHasError = Module.cwrap("engineHasError", "number", []);

console.log("1. Starting position, depth 3");
const move = engineGetBestMove(STARTING_FEN, 3);
console.log(`  engineGetBestMove -> "${move}"`);
check("no error flagged", engineHasError() === 0, `hasError() returned ${engineHasError()}`);
check("move is one of the 20 legal opening moves", LEGAL_STARTING_MOVES.has(move), `got "${move}"`);

console.log("2. Invalid FEN");
const badResult = engineGetBestMove("this is not a fen", 3);
check("NULL surfaces as an empty string via cwrap", badResult === "", `got "${badResult}"`);
check("error flag is set", engineHasError() === 1, `hasError() returned ${engineHasError()}`);
const error = engineGetError();
console.log(`  engineGetError -> "${error}"`);
check("error message is non-empty", error.length > 0);

console.log("3. Error flag resets after being read");
check("hasError() is 0 immediately after engineGetError()", engineHasError() === 0);
check("a second read returns the empty buffer, not the stale message", engineGetError() === "");

console.log("4. A later successful call clears any stale error");
engineGetBestMove("this is not a fen", 1); // leaves an error pending
const secondMove = engineGetBestMove(STARTING_FEN, 3);
check("hasError() is 0 after a successful call", engineHasError() === 0);
check("the successful move is still legal", LEGAL_STARTING_MOVES.has(secondMove), `got "${secondMove}"`);

console.log("");
if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All checks passed.");
