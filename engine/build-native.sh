#!/usr/bin/env bash
set -euo pipefail

# Builds the engine as a native command-line executable for local development.
#
# Kept separate from build.sh deliberately. That script produces the WASM
# artifacts that ship in /public and needs Emscripten installed. This one needs
# only a host C++ compiler, so it still works on a machine without Emscripten,
# and neither build can break the other.
#
# Output is engine/build/, which is gitignored. The binary is not an artifact
# anyone else needs.

# Resolve paths relative to the repo root, so the script works from any
# directory.
cd "$(dirname "$0")/.."

mkdir -p engine/build

# Honour CXX if the environment sets it, otherwise use the system compiler.
CXX="${CXX:-c++}"

"$CXX" -std=c++17 -O2 -Wall -Wextra -Wpedantic \
  engine/src/board.cpp \
  engine/src/move.cpp \
  engine/src/position.cpp \
  engine/src/movegen.cpp \
  engine/src/main.cpp \
  -o engine/build/onepawn-engine

echo "Built engine/build/onepawn-engine"
