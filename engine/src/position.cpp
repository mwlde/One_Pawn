#include "position.h"

namespace {

// The square the captured piece actually occupies. Every capture takes the
// piece standing on `to`, except en passant, which takes the pawn beside the
// mover: same file as the destination, same rank the moving pawn started on.
Square capturedSquareOf(const Move& move) {
  if (move.kind == MoveKind::EnPassant) {
    return makeSquare(fileOf(move.to), rankOf(move.from));
  }
  return move.to;
}

// Where the rook starts and ends in a castling move. The king's rank carries
// the colour, so this needs no Color argument.
struct RookTravel {
  Square from;
  Square to;
};

RookTravel rookTravelOf(const Move& move) {
  const int rank = rankOf(move.from);
  return (move.kind == MoveKind::CastleKingside)
             ? RookTravel{makeSquare(7, rank), makeSquare(5, rank)}
             : RookTravel{makeSquare(0, rank), makeSquare(3, rank)};
}

// Clears any castling right that depends on the given square being untouched.
//
// Calling this for both `from` and `to` covers all three ways rights are lost
// with no case analysis on the piece:
//
//   from == e1   the king moved, so White loses both rights
//   from == a1   the queenside rook moved
//   to   == a1   the queenside rook was captured where it stood
//
// The third case is the one that is easy to forget. A rook sitting on its home
// square, captured by a bishop that never moves again, still ends the right.
void revokeRightsFor(Square square, CastlingRights& rights) {
  if (square == makeSquare(4, 0)) {
    rights.whiteKingside = false;
    rights.whiteQueenside = false;
  } else if (square == makeSquare(0, 0)) {
    rights.whiteQueenside = false;
  } else if (square == makeSquare(7, 0)) {
    rights.whiteKingside = false;
  } else if (square == makeSquare(4, 7)) {
    rights.blackKingside = false;
    rights.blackQueenside = false;
  } else if (square == makeSquare(0, 7)) {
    rights.blackQueenside = false;
  } else if (square == makeSquare(7, 7)) {
    rights.blackKingside = false;
  }
}

}  // namespace

UndoRecord makeMove(Board& board, const Move& move) {
  UndoRecord undo;
  undo.castling = board.castling;
  undo.enPassantTarget = board.enPassantTarget;
  undo.halfmoveClock = board.halfmoveClock;

  const Piece moving = board.squares[move.from];
  const Color us = pieceColor(moving);

  const Square capturedSquare = capturedSquareOf(move);
  undo.capturedPiece = board.squares[capturedSquare];

  // Clearing the captured square before writing the destination matters only
  // for en passant, where the two are different squares. For every other move
  // the second write lands on the same square and overwrites the first.
  board.squares[capturedSquare] = Piece::Empty;
  board.squares[move.from] = Piece::Empty;
  board.squares[move.to] =
      (move.promotion != NO_PROMOTION) ? makePiece(us, move.promotion) : moving;

  if (isCastle(move)) {
    const RookTravel rook = rookTravelOf(move);
    board.squares[rook.to] = board.squares[rook.from];
    board.squares[rook.from] = Piece::Empty;
  }

  revokeRightsFor(move.from, board.castling);
  revokeRightsFor(move.to, board.castling);

  // The target is the square the pawn skipped over, not the square it landed
  // on. Averaging the two ranks avoids needing to know the pawn's colour.
  board.enPassantTarget =
      (move.kind == MoveKind::DoublePawnPush)
          ? makeSquare(fileOf(move.from), (rankOf(move.from) + rankOf(move.to)) / 2)
          : NO_SQUARE;

  // Tested against what was actually taken rather than move.isCapture, so the
  // clock stays right even if a caller hands over a move with a stale flag.
  const bool captured = !isEmpty(undo.capturedPiece);
  const bool pawnMove = pieceType(moving) == PieceType::Pawn;
  board.halfmoveClock = (captured || pawnMove) ? 0 : board.halfmoveClock + 1;

  if (us == Color::Black) ++board.fullmoveNumber;
  board.sideToMove = opposite(us);

  return undo;
}

void unmakeMove(Board& board, const Move& move, const UndoRecord& undo) {
  // Flip the side back first. Everything below needs to know who moved, and
  // after make that is whoever is *not* to move.
  board.sideToMove = opposite(board.sideToMove);
  const Color us = board.sideToMove;

  if (us == Color::Black) --board.fullmoveNumber;

  board.castling = undo.castling;
  board.enPassantTarget = undo.enPassantTarget;
  board.halfmoveClock = undo.halfmoveClock;

  // A promotion left a queen (or knight, or...) on the destination, but what
  // set out from `from` was a pawn. Every other move puts back whatever is
  // standing on the destination now.
  board.squares[move.from] = (move.promotion != NO_PROMOTION)
                                 ? makePiece(us, PieceType::Pawn)
                                 : board.squares[move.to];
  board.squares[move.to] = Piece::Empty;

  // For everything but en passant this writes the captured piece back over the
  // Empty just written above, and writes Empty again when nothing was captured.
  board.squares[capturedSquareOf(move)] = undo.capturedPiece;

  if (isCastle(move)) {
    const RookTravel rook = rookTravelOf(move);
    board.squares[rook.from] = board.squares[rook.to];
    board.squares[rook.to] = Piece::Empty;
  }
}
