#include <string>
#include <vector>

#include "board.h"
#include "movegen.h"
#include "position.h"
#include "test_harness.h"

// Tests for make/unmake, first written as a scratch harness during A2.2.2.
//
// Two kinds of test here, and both are needed.
//
// The round-trip tests ask only that unmake undoes make. That is a strong
// property and it is cheap to check exhaustively, but it is blind to a make
// that is wrong in a way unmake reverses just as wrongly.
//
// The specific tests fix that by stating what make is supposed to do to the
// board: which square holds what afterwards, which right is gone, what the
// clock reads. Those are the assertions a symmetric bug cannot satisfy.

namespace {

// Plays every legal move, takes it back, and compares the position against what
// it was. Recurses, so depth 2 covers Black's replies as well, where a bug in
// the other colour's pawn direction would show.
void checkRoundTrip(Board& board, int depth, const std::string& label) {
  if (depth == 0) return;

  const std::string before = boardSignature(board);

  for (const Move& move : generateLegalMoves(board)) {
    const UndoRecord undo = makeMove(board, move);
    checkRoundTrip(board, depth - 1, label);
    unmakeMove(board, move, undo);

    const std::string after = boardSignature(board);
    if (after != before) {
      // Reported per position rather than per move. A broken unmake usually
      // breaks for a whole class of move at once, and one line per failure
      // beats several thousand.
      checkEqual(after, before, label + ": round trip after " + moveToString(move, board));
      return;
    }
  }

  // Only counted at the top of the recursion, so the tally reads as one check
  // per position rather than one per interior node.
  if (!label.empty()) check(true, label + ": every move round-trips");
}

void checkRoundTripFrom(const std::string& fen, int depth, const std::string& label) {
  Board board = parseFen(fen);
  checkRoundTrip(board, depth, label);
}

Piece pieceAt(const Board& board, const std::string& square) {
  const int file = square[0] - 'a';
  const int rank = square[1] - '1';
  return board.squares[makeSquare(file, rank)];
}

}  // namespace

void runMakeUnmakeTests() {
  section("make/unmake: round trips");

  // The same six positions perft uses, at a depth shallow enough to stay fast.
  // Between them they contain every irregular move: castling both sides,
  // en passant, promotion, and captures of rooks on their home squares.
  checkRoundTripFrom("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 2, "starting");
  checkRoundTripFrom("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 2,
                     "kiwipete");
  checkRoundTripFrom("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 3, "en passant");
  checkRoundTripFrom("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", 2,
                     "promotions");
  checkRoundTripFrom("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", 2, "castling");
  checkRoundTripFrom("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", 2,
                     "stress");

  section("make/unmake: quiet moves and clocks");
  {
    Board board = parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    const Move knight = requireMove(board, "g1f3");
    const UndoRecord undo = makeMove(board, knight);

    check(isEmpty(pieceAt(board, "g1")), "quiet move empties the origin square");
    check(pieceAt(board, "f3") == Piece::WhiteKnight, "quiet move fills the destination square");
    check(board.sideToMove == Color::Black, "side to move flips");
    checkEqual(board.halfmoveClock, 1, "a quiet move increments the halfmove clock");
    checkEqual(board.fullmoveNumber, 1, "the fullmove number does not change after White moves");

    unmakeMove(board, knight, undo);
    checkEqual(board.fullmoveNumber, 1, "unmake leaves the fullmove number alone");
  }
  {
    // Black to move, so this is the half of the fullmove rule the position above
    // cannot test.
    Board board = parseFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
    const Move reply = requireMove(board, "g8f6");
    const UndoRecord undo = makeMove(board, reply);

    checkEqual(board.fullmoveNumber, 2, "the fullmove number increments after Black moves");
    check(board.enPassantTarget == NO_SQUARE, "an unused en passant target is cleared");

    unmakeMove(board, reply, undo);
    checkEqual(board.fullmoveNumber, 1, "unmake restores the fullmove number");
    checkEqual(squareName(board.enPassantTarget), std::string("e3"),
               "unmake restores the en passant target");
  }

  section("make/unmake: double pawn push");
  {
    Board board = parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 3 1");
    const Move push = requireMove(board, "e2e4");

    checkEqual(static_cast<int>(push.kind), static_cast<int>(MoveKind::DoublePawnPush),
               "a two-square pawn move is generated as a double push");

    const UndoRecord undo = makeMove(board, push);
    checkEqual(squareName(board.enPassantTarget), std::string("e3"),
               "the en passant target is the square skipped, not the one landed on");
    checkEqual(board.halfmoveClock, 0, "a pawn move resets the halfmove clock");

    unmakeMove(board, push, undo);
    checkEqual(board.halfmoveClock, 3, "unmake restores the halfmove clock");
  }

  section("make/unmake: en passant");
  {
    Board board = parseFen("k7/8/8/3pP3/8/8/8/K7 w - d6 0 1");
    const Move capture = requireMove(board, "e5d6");

    checkEqual(static_cast<int>(capture.kind), static_cast<int>(MoveKind::EnPassant),
               "capturing onto the target square is generated as en passant");

    const UndoRecord undo = makeMove(board, capture);
    check(pieceAt(board, "d6") == Piece::WhitePawn, "the capturing pawn lands on the target");
    check(isEmpty(pieceAt(board, "d5")), "the captured pawn is removed from beside the mover");
    check(isEmpty(pieceAt(board, "e5")), "the capturing pawn leaves its own square");

    unmakeMove(board, capture, undo);
    check(pieceAt(board, "d5") == Piece::BlackPawn, "unmake puts the captured pawn back on d5");
    check(pieceAt(board, "e5") == Piece::WhitePawn, "unmake puts the capturing pawn back on e5");
    check(isEmpty(pieceAt(board, "d6")), "unmake clears the target square");
  }

  section("make/unmake: promotion");
  {
    Board board = parseFen("8/P6k/8/8/8/8/8/K7 w - - 0 1");
    const std::vector<Move> moves = generateLegalMoves(board);

    int promotions = 0;
    for (const Move& move : moves) {
      if (move.from == makeSquare(0, 6) && move.promotion != NO_PROMOTION) ++promotions;
    }
    checkEqual(promotions, 4, "all four promotion pieces are generated");

    const Move underpromotion = requireMove(board, "a7a8n");
    const UndoRecord undo = makeMove(board, underpromotion);
    check(pieceAt(board, "a8") == Piece::WhiteKnight, "the promoted piece appears on the board");
    check(isEmpty(pieceAt(board, "a7")), "the pawn leaves its square");

    unmakeMove(board, underpromotion, undo);
    check(pieceAt(board, "a7") == Piece::WhitePawn, "unmake restores the pawn, not the knight");
    check(isEmpty(pieceAt(board, "a8")), "unmake clears the promotion square");
  }
  {
    // Promotion with a capture, which moves two pieces and changes a castling
    // right at once. b2a1 takes the rook standing on a1.
    Board board = parseFen("4k3/8/8/8/8/8/1p6/R3K3 b - - 0 1");
    const Move move = requireMove(board, "b2a1q");
    const UndoRecord undo = makeMove(board, move);

    check(pieceAt(board, "a1") == Piece::BlackQueen, "a capturing promotion replaces the captured piece");
    check(!board.castling.whiteQueenside, "capturing a rook on its home square revokes the right");

    unmakeMove(board, move, undo);
    check(pieceAt(board, "a1") == Piece::WhiteRook, "unmake restores the captured rook");
    check(pieceAt(board, "b2") == Piece::BlackPawn, "unmake restores the promoting pawn");
  }

  section("make/unmake: castling");
  {
    Board board = parseFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const Move shortCastle = requireMove(board, "e1g1");
    const UndoRecord undo = makeMove(board, shortCastle);

    check(pieceAt(board, "g1") == Piece::WhiteKing, "the king reaches g1");
    check(pieceAt(board, "f1") == Piece::WhiteRook, "the rook jumps to f1");
    check(isEmpty(pieceAt(board, "e1")) && isEmpty(pieceAt(board, "h1")),
          "both origin squares are emptied");
    check(!board.castling.whiteKingside && !board.castling.whiteQueenside,
          "castling revokes both of the mover's rights");
    check(board.castling.blackKingside && board.castling.blackQueenside,
          "the opponent's rights are untouched");

    unmakeMove(board, shortCastle, undo);
    check(pieceAt(board, "e1") == Piece::WhiteKing && pieceAt(board, "h1") == Piece::WhiteRook,
          "unmake returns both king and rook");
    check(board.castling.whiteKingside && board.castling.whiteQueenside,
          "unmake restores the castling rights");
  }
  {
    Board board = parseFen("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1");
    const Move longCastle = requireMove(board, "e8c8");
    const UndoRecord undo = makeMove(board, longCastle);

    check(pieceAt(board, "c8") == Piece::BlackKing, "the king reaches c8");
    check(pieceAt(board, "d8") == Piece::BlackRook, "the queenside rook jumps to d8");
    check(isEmpty(pieceAt(board, "b8")), "b8 is crossed, not occupied");

    unmakeMove(board, longCastle, undo);
    check(pieceAt(board, "e8") == Piece::BlackKing && pieceAt(board, "a8") == Piece::BlackRook,
          "unmake returns both king and rook");
  }
  {
    // The case that is easy to forget: a right lost because the rook was
    // captured where it stood, by a piece that is not otherwise involved.
    Board board = parseFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const Move takeRook = requireMove(board, "a1a8");
    const UndoRecord undo = makeMove(board, takeRook);

    check(!board.castling.blackQueenside, "capturing a rook on a8 revokes Black's queenside right");
    check(board.castling.blackKingside, "Black's other right survives");
    check(!board.castling.whiteQueenside, "the moving rook loses White's queenside right too");
    checkEqual(board.halfmoveClock, 0, "a capture resets the halfmove clock");

    unmakeMove(board, takeRook, undo);
    check(board.castling.blackQueenside && board.castling.whiteQueenside,
          "unmake restores both rights");
  }
}
