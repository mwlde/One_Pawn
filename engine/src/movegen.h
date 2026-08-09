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
