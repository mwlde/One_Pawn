#include <string>
#include <vector>

#include "board.h"
#include "move.h"
#include "movegen.h"
#include "test_harness.h"

// Tests for attack detection and the legality filter, first written as a
// scratch harness during A2.2.3.
//
// isSquareAttacked is the quietest piece of the engine and the one with the
// most riding on it. Nothing calls it directly except king safety, so a bug in
// it does not crash or misbehave visibly. It just lets an illegal move through,
// or forbids a legal one, in positions nobody happened to look at. Perft finds
// those eventually. These tests find them by name.

namespace {

Square square(const std::string& name) { return makeSquare(name[0] - 'a', name[1] - '1'); }

bool attacked(const Board& board, const std::string& name, Color attacker) {
  return isSquareAttacked(board, square(name), attacker);
}

bool hasMove(const Board& board, const std::string& notation) {
  for (const Move& move : generateLegalMoves(board)) {
    if (moveToString(move, board) == notation) return true;
  }
  return false;
}

bool hasMoveFrom(const Board& board, const std::string& name) {
  for (const Move& move : generateLegalMoves(board)) {
    if (move.from == square(name)) return true;
  }
  return false;
}

}  // namespace

void runAttackTests() {
  section("attacks: pawns");
  {
    Board board = parseFen("8/8/8/8/4P3/8/8/K6k w - - 0 1");
    check(attacked(board, "d5", Color::White), "a White pawn attacks up-left");
    check(attacked(board, "f5", Color::White), "a White pawn attacks up-right");
    check(!attacked(board, "e5", Color::White), "a pawn does not attack the square it pushes to");
    check(!attacked(board, "d3", Color::White), "a White pawn does not attack backwards");
  }
  {
    // The direction is the whole reason pawns are special-cased in
    // isSquareAttacked. Get the sign wrong and it is Black that breaks.
    Board board = parseFen("8/8/8/4p3/8/8/8/K6k w - - 0 1");
    check(attacked(board, "d4", Color::Black), "a Black pawn attacks down-left");
    check(attacked(board, "f4", Color::Black), "a Black pawn attacks down-right");
    check(!attacked(board, "d6", Color::Black), "a Black pawn does not attack backwards");
  }
  {
    Board board = parseFen("8/8/8/4P3/3P4/8/8/K6k w - - 0 1");
    check(attacked(board, "e5", Color::White),
          "a square holding the attacker's own piece still counts as attacked");
  }

  section("attacks: knights, kings, sliders");
  {
    Board board = parseFen("8/8/8/8/3N4/8/8/K6k w - - 0 1");
    check(attacked(board, "e6", Color::White) && attacked(board, "c2", Color::White),
          "a knight attacks its L-shaped squares");
    check(!attacked(board, "d5", Color::White), "a knight does not attack adjacent squares");
    check(!attacked(board, "e6", Color::Black), "the attacker's colour is respected");
  }
  {
    Board board = parseFen("8/8/8/8/8/8/8/K6k w - - 0 1");
    check(attacked(board, "b2", Color::White) && attacked(board, "a2", Color::White),
          "a king attacks the squares beside it");
    check(!attacked(board, "c3", Color::White), "a king attacks one square only");
    check(attacked(board, "g2", Color::Black), "the Black king attacks too");
  }
  {
    // Rook on a8, enemy bishop on d8. The ray stops at the bishop, so anything
    // past it is safe. Getting this wrong is how x-ray bugs start.
    Board board = parseFen("R2b2k1/8/8/8/8/8/8/K7 w - - 0 1");
    check(attacked(board, "d8", Color::White), "a rook attacks the first piece on its ray");
    check(!attacked(board, "e8", Color::White), "a rook does not attack through a piece");
    check(attacked(board, "a4", Color::White), "a rook attacks down an empty file");
  }
  {
    Board board = parseFen("8/8/8/8/3Q4/8/8/K6k w - - 0 1");
    check(attacked(board, "d8", Color::White), "a queen attacks like a rook");
    check(attacked(board, "g7", Color::White), "a queen attacks like a bishop");
    check(!attacked(board, "e6", Color::White), "a queen does not attack like a knight");
  }
  {
    Board board = parseFen("8/8/8/8/3B4/8/8/K6k w - - 0 1");
    check(attacked(board, "g7", Color::White), "a bishop attacks its diagonal");
    check(!attacked(board, "d8", Color::White), "a bishop does not attack files");
  }

  section("king lookup and check");
  {
    Board board = parseFen("8/8/8/8/8/8/8/K6k w - - 0 1");
    checkEqual(squareName(findKing(board, Color::White)), std::string("a1"),
               "findKing locates the White king");
    checkEqual(squareName(findKing(board, Color::Black)), std::string("h1"),
               "findKing locates the Black king");
  }
  {
    // Perft positions all have both kings, but attack-only test positions
    // often do not, and findKing promises to cope rather than run off the end.
    Board board = parseFen("8/8/8/8/8/8/8/K7 w - - 0 1");
    check(findKing(board, Color::Black) == NO_SQUARE, "findKing returns NO_SQUARE for a missing king");
    check(!isInCheck(board), "a side with no king is not in check");
  }
  {
    Board board = parseFen("4k3/8/8/8/8/8/8/4R1K1 b - - 0 1");
    check(isInCheck(board), "a rook on the king's file gives check");
    checkEqual(generateLegalMoves(board).size(), 4u,
               "in check, only the four king moves off the file are legal");
  }

  section("legality: pins and king safety");
  {
    // The knight on e7 stands between its king and a rook. It has eight
    // pseudo-legal moves and no legal ones.
    Board board = parseFen("4k3/4n3/8/8/8/8/8/4RK2 b - - 0 1");
    check(!isInCheck(board), "a pinned piece is not itself a check");
    check(!hasMoveFrom(board, "e7"), "a pinned knight has no legal moves");
    check(hasMove(board, "e8d8"), "the king may still step off the pin");
  }
  {
    Board board = parseFen("4k3/8/8/8/8/8/8/4KR2 b - - 0 1");
    check(!hasMove(board, "e8f8"), "the king may not step onto an attacked square");
    check(hasMove(board, "e8d8"), "the king may step onto a safe one");
  }
  {
    // Fool's mate. No legal move and in check, which is how the caller is meant
    // to tell mate from stalemate.
    Board board = parseFen("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
    check(isInCheck(board) && generateLegalMoves(board).empty(), "checkmate leaves no legal move");
  }
  {
    Board board = parseFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    check(!isInCheck(board) && generateLegalMoves(board).empty(),
          "stalemate leaves no legal move and no check");
  }

  section("legality: castling");
  {
    Board board = parseFen("r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1");
    check(hasMove(board, "e8g8") && hasMove(board, "e8c8"),
          "both castles are legal with an empty board between");
  }
  {
    Board board = parseFen("r3k2r/8/8/8/4R3/8/8/4K3 b kq - 0 1");
    check(!hasMove(board, "e8g8") && !hasMove(board, "e8c8"),
          "castling out of check is illegal on both sides");
  }
  {
    // f8 is the square the king crosses on the kingside.
    Board board = parseFen("r3k2r/8/8/8/5R2/8/8/4K3 b kq - 0 1");
    check(!hasMove(board, "e8g8"), "castling through an attacked square is illegal");
    check(hasMove(board, "e8c8"), "the other side is unaffected");
  }
  {
    Board board = parseFen("r3k2r/8/8/8/6R1/8/8/4K3 b kq - 0 1");
    check(!hasMove(board, "e8g8"), "castling into check is illegal");
  }
  {
    // b8 is crossed by the rook, not the king, so an attack on it is irrelevant.
    // This is the condition it is easiest to add by mistake.
    Board board = parseFen("r3k2r/8/8/8/1R6/8/8/4K3 b kq - 0 1");
    check(hasMove(board, "e8c8"), "an attack on b8 does not prevent queenside castling");
  }
  {
    // The rook's path must still be clear, even though the king never reaches
    // b8.
    Board board = parseFen("rn2k2r/8/8/8/8/8/8/4K3 b kq - 0 1");
    check(!hasMove(board, "e8c8"), "a piece on b8 blocks queenside castling");
  }
}
