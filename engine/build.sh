#!/usr/bin/env bash
set -euo pipefail

mkdir -p engine/build public

# Compiles the real engine plus the JS-facing shim to WASM. main.cpp, game.cpp
# and perft.cpp are deliberately left out: they are CLI/testing concerns that
# have no business shipping to a browser. hello.cpp (Phase 0's proof that the
# toolchain works) is left out too, on purpose, kept only as a native build
# for now and superseded in B2.
emcc engine/src/wasm_api.cpp \
  engine/src/board.cpp \
  engine/src/move.cpp \
  engine/src/movegen.cpp \
  engine/src/position.cpp \
  engine/src/evaluate.cpp \
  engine/src/search.cpp \
  -O2 \
  -fexceptions \
  -s EXPORTED_FUNCTIONS='["_engineGetBestMove","_engineGetError","_engineHasError"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web \
  -o public/engine.js

# -fexceptions is the current, Clang-compatible way to ask Emscripten for C++
# exception support (JS-based unwinding under the hood). The older spelling,
# -s DISABLE_EXCEPTION_CATCHING=0, still works but is the flag Emscripten's own
# docs now point away from. wasm_api.cpp's whole job is to catch every
# exception before it reaches JS, so this only needs to work inside that one
# file; nothing else in this build throws across a boundary it can't be
# caught at.
