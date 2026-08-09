#pragma once

#include <vector>

#include "board.h"
#include "move.h"

// Pseudo-legal move generation.
//
// "Pseudo-legal" means every move that obeys the movement rules of its piece,
// with no regard for what it does to your own king. A pinned knight still
// moves. The king still steps onto attacked squares. Filtering those out needs
// make/unmake and an attack test, which is A2.2.
//
// The split is standard and it is worth understanding why. Legality is a
// property of the position after the move, so testing it means playing the move
// first. Keeping the generator ignorant of that keeps it a pure function of
// piece placement, which is far easier to reason about and to test.

// Moves for board.sideToMove, in a stable order: by origin square from a1 to
// h8, then in the fixed direction order of each piece's offset table.
std::vector<Move> generatePseudoLegalMoves(const Board& board);

// True if any piece of `attacker` could capture on `square`, were it their
// turn. Declared here rather than in a header of its own so it can share the
// direction tables the generator already uses; they are private to movegen.cpp
// and exporting them just to split this out would widen the interface for
// nothing.
//
// What stands on `square` is not consulted. A square occupied by the attacker's
// own piece still counts as attacked, which is exactly the question "is this
// piece defended, so that the enemy king may not take it".
//
// Ignores en passant. The only caller is king safety, and no king is ever
// captured en passant.
bool isSquareAttacked(const Board& board, Square square, Color attacker);

// The square board.sideToMove's king stands on, or NO_SQUARE if that side has
// no king. Test positions often leave a king off, so callers must cope.
Square findKing(const Board& board, Color color);

// True if the side to move is in check.
bool isInCheck(const Board& board);

// Moves for board.sideToMove that do not leave its own king attacked, in the
// same order generatePseudoLegalMoves produces them.
//
// An empty result means the game is over: checkmate if isInCheck, stalemate
// otherwise. Distinguishing the two is the caller's job, since it needs no
// information the caller does not already have.
std::vector<Move> generateLegalMoves(const Board& board);
