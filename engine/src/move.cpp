#include "move.h"

namespace {

// Indexed by PieceType, so this literal must stay in PieceType order. board.cpp
// has the same table for board printing; it is four characters of duplication
// against making one file depend on the other's internals.
char promotionChar(PieceType type) {
  const char symbols[] = "pnbrqk";
  return symbols[static_cast<int>(type)];
}

}  // namespace

bool isCastle(const Move& move) {
  return move.kind == MoveKind::CastleKingside || move.kind == MoveKind::CastleQueenside;
}

// The second parameter is left unnamed. In C++ that declares "this argument
// exists but is not used", which keeps -Wunused-parameter quiet without
// resorting to a cast-to-void.
std::string moveToString(const Move& move, const Board&) {
  std::string text = squareName(move.from) + squareName(move.to);
  if (move.promotion != NO_PROMOTION) {
    text += promotionChar(move.promotion);
  }
  return text;
}
