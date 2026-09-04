#!/usr/bin/env bash
set -euo pipefail

# Builds and runs the C++ engine test suite.
#
# A third script rather than a flag on build-native.sh, for the reason that
# script gives for existing at all: two builds that cannot break each other. The
# test binary has its own main, so it cannot share a link line with the CLI
# anyway.
#
# Exit code is the suite's, so this is usable from CI or a pre-commit hook
# without parsing the output.

cd "$(dirname "$0")/.."

mkdir -p engine/build

CXX="${CXX:-c++}"

# -I engine/src so the test files include "board.h" the same way the engine's
# own sources do. main.cpp is deliberately absent: it holds the CLI's main.
"$CXX" -std=c++17 -O2 -Wall -Wextra -Wpedantic \
  -I engine/src \
  engine/src/board.cpp \
  engine/src/move.cpp \
  engine/src/position.cpp \
  engine/src/movegen.cpp \
  engine/src/perft.cpp \
  engine/src/evaluate.cpp \
  engine/src/search.cpp \
  engine/tests/test_position.cpp \
  engine/tests/test_movegen.cpp \
  engine/tests/test_perft.cpp \
  engine/tests/test_evaluate.cpp \
  engine/tests/test_search.cpp \
  engine/tests/test_main.cpp \
  -o engine/build/onepawn-tests

echo "Built engine/build/onepawn-tests"
echo

engine/build/onepawn-tests
