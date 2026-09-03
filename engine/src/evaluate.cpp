#include "evaluate.h"

#include <array>

namespace {

// Centipawn values, indexed by PieceType. The array order matches the enum's
// declaration order (Pawn, Knight, Bishop, Rook, Queen, King), so the cast
// below is a direct index rather than a six-branch switch.
//
// These are the classic values, near enough universal across engines. The
// knight and bishop are not both 300: the bishop gets a token ten points so
// that a search with nothing else to separate them prefers keeping the bishop,
// which matches how the pieces actually perform in open positions. It is a
// crude stand-in for the bishop pair bonus that belongs in A4.
//
// The king is 0. Not because it is worthless, but because it is never absent:
// both sides always have exactly one, so any value at all cancels out of every
// legal position. Giving it a large number is a common trick in engines that
// detect mate by material, and this one does not: the search detects mate from
// an empty move list. A non-zero king would only be an invitation to overflow.
constexpr std::array<int, 6> PIECE_VALUES = {100, 320, 330, 500, 900, 0};

}  // namespace

int evaluate(const Board& board) {
  // Accumulated from White's point of view first, because "White minus Black"
  // is the easier thing to reason about and to hand-check against a board. The
  // flip to side-to-move perspective happens once, at the end.
  int score = 0;

  for (Square square = 0; square < BOARD_SIZE; ++square) {
    const Piece piece = board.squares[square];
    if (isEmpty(piece)) continue;  // pieceType is undefined on Piece::Empty

    const int value = PIECE_VALUES[static_cast<int>(pieceType(piece))];
    score += (pieceColor(piece) == Color::White) ? value : -value;
  }

  return (board.sideToMove == Color::White) ? score : -score;
}
