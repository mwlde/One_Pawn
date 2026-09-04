#pragma once

#include <cstdint>

#include "board.h"
#include "move.h"

// Negamax search with alpha-beta pruning: the part that actually plays chess.
//
// Evaluation judges a single position. Search is what turns that into a move,
// by playing out every legal continuation to a fixed depth and asking the
// evaluator about the positions at the bottom. The move it returns is the one
// leading to the best leaf, assuming both sides play the best line the search
// can see.
//
// "To a fixed depth" is the whole compromise. Chess does not fit in any
// machine, so the search stops after a set number of plies and pretends the
// position it stopped at is final. Everything that makes an engine strong is
// some way of making that pretence less damaging.
//
// This is the A3.2 version: vanilla negamax, alpha-beta, no enhancements. No
// move ordering, no iterative deepening, no transposition table, no quiescence
// search. Those come later and none of them change the answer, only the time
// taken to reach it. Except quiescence, which does change the answer, and that
// is why it comes first among them.

// Checkmate, scored as a number so it can be compared against material.
//
// The value is arbitrary but must sit far above any reachable material score.
// The most lopsided legal position is worth a few thousand centipawns, so
// 30000 is unreachable by counting pieces and cannot be confused with one.
//
// Mates are reported as MATE_SCORE minus the ply they occur at, never as
// MATE_SCORE itself. That adjustment is what makes the engine finish games.
// Without it every forced mate scores the same, so a mate in five looks exactly
// as good as a mate in one, and an engine that sees both may shuffle between
// them forever. Subtracting the distance makes the near mate strictly better.
// The same subtraction, mirrored, makes the engine pick the longest resistance
// when it is the one being mated.
constexpr int MATE_SCORE = 30000;

// Scores at or beyond this magnitude are mates rather than material. The gap is
// the deepest mate distance that can be encoded, which is far more plies than
// this search will ever reach.
constexpr int MATE_THRESHOLD = MATE_SCORE - 1000;

// The best move for board.sideToMove, searched to `depth` plies.
//
// The board is taken by mutable reference because searching means playing
// moves. Every make is paired with an unmake on every path out of the
// recursion, so the caller's board is in its original state when this returns,
// exactly as with perft.
//
// Returns a null move when the position is over, which is to say when there are
// no legal moves at all. Callers must check with isNullMove before using it.
// Depth 0 also returns a null move: zero plies of search is a request for the
// static verdict, not for a move.
//
// The score and node count of that search are read back through the two
// accessors below rather than returned, which keeps this signature to the one
// thing callers usually want. See the note on those functions.
Move findBestMove(Board& board, int depth);

// True for the placeholder returned when there is no move to make.
bool isNullMove(const Move& move);

// The score and node count of the most recent findBestMove call on this thread.
//
// Thread-local rather than returned in a struct, and that is a deliberate
// trade rather than an oversight. The score matters to the CLI and to tests but
// not to a caller that only wants a move, and a search that reports its own
// statistics is the pattern every engine ends up with once there are half a
// dozen of them to report. If A3.3 needs more than two, they become a struct.
//
// Thread-local, not global, so that a future parallel search does not have two
// threads writing one counter. Both are reset at the start of every
// findBestMove call, so they always describe the last search and never
// accumulate across searches.
int lastSearchScore();
uint64_t lastSearchNodes();
