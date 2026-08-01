#!/usr/bin/env bash
set -euo pipefail

mkdir -p engine/build public

emcc engine/src/hello.cpp \
  -O2 \
  -s EXPORTED_FUNCTIONS='["_add"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web \
  -o public/engine.js
