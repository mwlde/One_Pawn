#pragma once

#include <cstdint>

#include "board.h"

// Perft: a move generator's test suite, borrowed from the wider chess
// programming community.
//
// perft(depth) counts the leaves of the game tree at that depth. Not distinct
// positions, not games: move sequences. If the generator invents a move it
// should not, or misses one it should find, the count diverges from the
// published figure, and it diverges by more the deeper you look. A single
// wrong pawn capture at depth 1 becomes thousands of wrong leaves at depth 5.
//
// The value of this is that the answers are already known. Dozens of engines
// have agreed on these numbers for decades, to the last digit, for a handful of
// standard positions. So this is not a test we wrote and might have written
// wrong. It is an external check on the whole of A2: generation, make, unmake,
// attack detection, and the legality filter, all at once.
//
// It is not a benchmark of playing strength and it never becomes one. Perft is
// the thing you get right before search is worth writing, because a search
// built on a broken generator searches a game that is not chess.

// Counts legal move sequences of exactly `depth` plies from this position.
//
// The board is taken by mutable reference because counting means playing every
// move. make/unmake are paired on every path out of the recursion, so the
// caller's board is in its original state when this returns. Taking a copy
// instead would be a copy per node, which is exactly the cost a search exists
// to avoid, and this is the same access pattern a search will use.
//
// uint64_t, not int. Perft grows by roughly a factor of thirty per ply: the
// starting position reaches 119,060,324 at depth 6, well past the two billion
// an int holds, and the overflow would be silent.
uint64_t perft(Board& board, int depth);

// perft, but broken down by first move: one line of "move: count" per legal
// move, then the total.
//
// This is the debugger. A total that disagrees with the published figure says
// only that something is wrong somewhere in millions of nodes. Comparing
// divides against a known-good engine narrows it to a single first move, and
// repeating that inside the failing move narrows it again, until the wrong
// count is one ply deep and can be read off the board by eye.
void perftDivide(Board& board, int depth);
