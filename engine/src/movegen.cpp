#include "movegen.h"

#include <array>

#include "position.h"

namespace {

// A step expressed as a file and rank delta rather than a single index offset.
//
// This matters. The board is a flat 64-element array, so "one square east"
// looks like +1, but +1 from h1 (index 7) lands on a2 (index 8). The piece
// walks off the edge and reappears on the far side. Working in file/rank pairs
// makes the edge a bounds check on two small numbers, which is hard to get
// wrong. Board representations that avoid the check entirely (0x88, mailbox-120,
// bitboards) exist and are faster, but they trade clarity for it. Not yet.
struct Step {
  int fileDelta;
  int rankDelta;
};

constexpr std::array<Step, 4> ROOK_STEPS{{{1, 0}, {-1, 0}, {0, 1}, {0, -1}}};

constexpr std::array<Step, 4> BISHOP_STEPS{{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}}};

// The queen's rays and the king's single steps are the same eight directions,
// so one table serves both.
constexpr std::array<Step, 8> ALL_STEPS{
    {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {1, -1}, {-1, 1}, {-1, -1}}};

constexpr std::array<Step, 8> KNIGHT_STEPS{
    {{1, 2}, {2, 1}, {2, -1}, {1, -2}, {-1, -2}, {-2, -1}, {-2, 1}, {-1, 2}}};

bool onBoard(int file, int rank) { return file >= 0 && file < 8 && rank >= 0 && rank < 8; }

// Named buildMove, not makeMove: it constructs a Move object and touches no
// board. position.h's makeMove is the one that plays a move.
Move buildMove(Square from, Square to, bool isCapture) {
  Move move;
  move.from = from;
  move.to = to;
  move.isCapture = isCapture;
  return move;
}

// Walks outward from `from` in each given direction until the ray leaves the
// board or meets a piece.
//
// The three stopping cases are the whole of sliding movement:
//   empty square   record a quiet move and keep going
//   enemy piece    record a capture and stop, because the piece blocks the rest
//                  of the ray
//   friendly piece stop without recording, for the same reason
//
// This is why a bishop on an open board has more moves than one in a corner
// without any of that being special-cased: the board edge ends the loop by
// itself.
//
// The Steps parameter is a template parameter because the tables have different
// lengths, so std::array<Step, 4> and std::array<Step, 8> are different types.
// Templating on the whole container is the least fussy way to accept both. A
// non-template alternative would take a pointer and a count, which is the C
// answer and easier to get wrong.
template <typename Steps>
void generateRayMoves(const Board& board, Square from, Color us, const Steps& steps,
                      std::vector<Move>& moves) {
  const int startFile = fileOf(from);
  const int startRank = rankOf(from);

  for (const Step& step : steps) {
    int file = startFile + step.fileDelta;
    int rank = startRank + step.rankDelta;

    while (onBoard(file, rank)) {
      const Square to = makeSquare(file, rank);
      const Piece target = board.squares[to];

      if (isEmpty(target)) {
        moves.push_back(buildMove(from, to, false));
      } else {
        if (pieceColor(target) != us) {
          moves.push_back(buildMove(from, to, true));
        }
        break;
      }

      file += step.fileDelta;
      rank += step.rankDelta;
    }
  }
}

// Knights and kings move exactly one step per direction, so this is the ray
// walk with the loop removed.
template <typename Steps>
void generateStepMoves(const Board& board, Square from, Color us, const Steps& steps,
                       std::vector<Move>& moves) {
  const int startFile = fileOf(from);
  const int startRank = rankOf(from);

  for (const Step& step : steps) {
    const int file = startFile + step.fileDelta;
    const int rank = startRank + step.rankDelta;
    if (!onBoard(file, rank)) continue;

    const Square to = makeSquare(file, rank);
    const Piece target = board.squares[to];

    if (isEmpty(target)) {
      moves.push_back(buildMove(from, to, false));
    } else if (pieceColor(target) != us) {
      moves.push_back(buildMove(from, to, true));
    }
  }
}

// Pawns are the only piece whose movement depends on colour, and the only one
// that captures differently from how it moves. Everything below is driven by
// three colour-dependent numbers, which keeps one code path instead of two.
struct PawnGeometry {
  int forward;        // rank delta of a single push
  int startRank;      // rank the double push is allowed from
  int promotionRank;  // rank that turns a push or capture into a promotion
};

PawnGeometry pawnGeometry(Color us) {
  return (us == Color::White) ? PawnGeometry{1, 1, 7} : PawnGeometry{-1, 6, 0};
}

// Appends the move, or its four promotion variants when it lands on the last
// rank. Underpromotion is generated because it is occasionally the only winning
// move, most famously to deliver a knight fork or to avoid stalemate.
void addPawnMove(Move move, int promotionRank, std::vector<Move>& moves) {
  if (rankOf(move.to) != promotionRank) {
    moves.push_back(move);
    return;
  }

  for (PieceType type : {PieceType::Knight, PieceType::Bishop, PieceType::Rook, PieceType::Queen}) {
    move.promotion = type;
    moves.push_back(move);
  }
}

void generatePawnMoves(const Board& board, Square from, Color us, std::vector<Move>& moves) {
  const PawnGeometry geometry = pawnGeometry(us);
  const int file = fileOf(from);
  const int rank = rankOf(from);

  // A pawn can never be on the last rank, so the single push is always on the
  // board and needs no bounds check.
  const Square push = makeSquare(file, rank + geometry.forward);
  if (isEmpty(board.squares[push])) {
    addPawnMove(buildMove(from, push, false), geometry.promotionRank, moves);

    // Both squares must be empty. A pawn does not jump.
    if (rank == geometry.startRank) {
      const Square doublePush = makeSquare(file, rank + 2 * geometry.forward);
      if (isEmpty(board.squares[doublePush])) {
        Move move = buildMove(from, doublePush, false);
        move.kind = MoveKind::DoublePawnPush;
        moves.push_back(move);
      }
    }
  }

  for (int fileDelta : {-1, 1}) {
    const int captureFile = file + fileDelta;
    if (captureFile < 0 || captureFile > 7) continue;

    const Square to = makeSquare(captureFile, rank + geometry.forward);
    const Piece target = board.squares[to];

    if (!isEmpty(target) && pieceColor(target) != us) {
      addPawnMove(buildMove(from, to, true), geometry.promotionRank, moves);
    } else if (to == board.enPassantTarget) {
      // The en passant target square is empty, so the ordinary capture test
      // above can never produce this move. The captured pawn sits beside the
      // mover, on the target's file and the mover's rank.
      Move move = buildMove(from, to, true);
      move.kind = MoveKind::EnPassant;
      moves.push_back(move);
    }
  }
}

// Pseudo-legal castling checks two things only: the right survives, and the
// squares between king and rook are empty.
//
// It deliberately does not test whether the king is in check, passes through an
// attacked square, or lands on one. Those need an attack test, which needs
// A2.2. Perft will catch it if they are forgotten.
void generateCastlingMoves(const Board& board, Square from, Color us, std::vector<Move>& moves) {
  const int homeRank = (us == Color::White) ? 0 : 7;

  // Guard, not a legality check. Castling rights are recorded per colour, not
  // per square, so a malformed FEN could pair them with a king that has wandered
  // off e1. Generating a move from wherever that king stands to g1 would be
  // nonsense rather than merely illegal.
  if (from != makeSquare(4, homeRank)) return;

  const bool kingside = (us == Color::White) ? board.castling.whiteKingside
                                             : board.castling.blackKingside;
  const bool queenside = (us == Color::White) ? board.castling.whiteQueenside
                                              : board.castling.blackQueenside;

  const auto squareIsEmpty = [&](int file) {
    return isEmpty(board.squares[makeSquare(file, homeRank)]);
  };

  // A castling right in a FEN does not guarantee the rook is still there, and
  // a right without its rook is not a movement-rule question but a broken
  // position. Checking here rather than in the legality filter keeps a promise
  // to makeMove: a castling move it receives always has a rook to move.
  // Without it, make would shift an empty square onto f1 and corrupt the board.
  const Piece ourRook = makePiece(us, PieceType::Rook);
  const auto rookIsHome = [&](int file) {
    return board.squares[makeSquare(file, homeRank)] == ourRook;
  };

  if (kingside && rookIsHome(7) && squareIsEmpty(5) && squareIsEmpty(6)) {
    Move move = buildMove(from, makeSquare(6, homeRank), false);
    move.kind = MoveKind::CastleKingside;
    moves.push_back(move);
  }

  // b1 must be empty as well. The rook passes over it, even though the king
  // does not, which is why this side checks three squares and not two.
  if (queenside && rookIsHome(0) && squareIsEmpty(1) && squareIsEmpty(2) && squareIsEmpty(3)) {
    Move move = buildMove(from, makeSquare(2, homeRank), false);
    move.kind = MoveKind::CastleQueenside;
    moves.push_back(move);
  }
}

// True if `square` holds exactly `piece`. Folds the bounds check in, so the
// attack tests below read as one condition rather than two.
bool holdsPiece(const Board& board, int file, int rank, Piece piece) {
  return onBoard(file, rank) && board.squares[makeSquare(file, rank)] == piece;
}

// The first piece met walking outward from `from`, or Empty if the ray runs off
// the board without meeting one.
Piece firstPieceOnRay(const Board& board, Square from, const Step& step) {
  int file = fileOf(from) + step.fileDelta;
  int rank = rankOf(from) + step.rankDelta;

  while (onBoard(file, rank)) {
    const Piece piece = board.squares[makeSquare(file, rank)];
    if (!isEmpty(piece)) return piece;
    file += step.fileDelta;
    rank += step.rankDelta;
  }
  return Piece::Empty;
}

// True if the first piece along `step` is one of `attacker`'s, and of a type
// that slides in that direction.
bool raySliderAttacks(const Board& board, Square square, const Step& step, Color attacker,
                      PieceType slider) {
  const Piece piece = firstPieceOnRay(board, square, step);
  if (isEmpty(piece) || pieceColor(piece) != attacker) return false;
  const PieceType type = pieceType(piece);
  return type == slider || type == PieceType::Queen;
}

}  // namespace

// Looks outward from the square rather than looping over every enemy piece.
//
// This works because attack is symmetric for every piece except the pawn. If a
// rook on a8 attacks a1, then walking a rook's rays from a1 reaches that rook
// before anything else. So the question "does a rook attack me" becomes "is the
// first piece along one of my rook rays an enemy rook or queen", which costs
// eight short walks instead of a scan of all 64 squares.
//
// Pawns are the exception, because a pawn captures forwards only. To find White
// pawns attacking a square you look one rank *down* from it, against White's
// direction of travel.
bool isSquareAttacked(const Board& board, Square square, Color attacker) {
  const int file = fileOf(square);
  const int rank = rankOf(square);

  // Fixed-cost tests first. They are cheaper than the ray walks and, for pawns
  // and knights, the commonest attackers in a real position.
  const int pawnRank = rank - pawnGeometry(attacker).forward;
  const Piece enemyPawn = makePiece(attacker, PieceType::Pawn);
  if (holdsPiece(board, file - 1, pawnRank, enemyPawn)) return true;
  if (holdsPiece(board, file + 1, pawnRank, enemyPawn)) return true;

  const Piece enemyKnight = makePiece(attacker, PieceType::Knight);
  for (const Step& step : KNIGHT_STEPS) {
    if (holdsPiece(board, file + step.fileDelta, rank + step.rankDelta, enemyKnight)) return true;
  }

  const Piece enemyKing = makePiece(attacker, PieceType::King);
  for (const Step& step : ALL_STEPS) {
    if (holdsPiece(board, file + step.fileDelta, rank + step.rankDelta, enemyKing)) return true;
  }

  for (const Step& step : ROOK_STEPS) {
    if (raySliderAttacks(board, square, step, attacker, PieceType::Rook)) return true;
  }
  for (const Step& step : BISHOP_STEPS) {
    if (raySliderAttacks(board, square, step, attacker, PieceType::Bishop)) return true;
  }

  return false;
}

std::vector<Move> generatePseudoLegalMoves(const Board& board) {
  std::vector<Move> moves;
  const Color us = board.sideToMove;

  for (Square from = 0; from < BOARD_SIZE; ++from) {
    const Piece piece = board.squares[from];
    if (isEmpty(piece) || pieceColor(piece) != us) continue;

    switch (pieceType(piece)) {
      case PieceType::Knight:
        generateStepMoves(board, from, us, KNIGHT_STEPS, moves);
        break;
      case PieceType::Bishop:
        generateRayMoves(board, from, us, BISHOP_STEPS, moves);
        break;
      case PieceType::Rook:
        generateRayMoves(board, from, us, ROOK_STEPS, moves);
        break;
      case PieceType::Queen:
        generateRayMoves(board, from, us, ALL_STEPS, moves);
        break;
      case PieceType::King:
        generateStepMoves(board, from, us, ALL_STEPS, moves);
        generateCastlingMoves(board, from, us, moves);
        break;
      case PieceType::Pawn:
        generatePawnMoves(board, from, us, moves);
        break;
    }
  }

  return moves;
}

Square findKing(const Board& board, Color color) {
  const Piece king = makePiece(color, PieceType::King);
  for (Square square = 0; square < BOARD_SIZE; ++square) {
    if (board.squares[square] == king) return square;
  }
  return NO_SQUARE;
}

bool isInCheck(const Board& board) {
  const Square king = findKing(board, board.sideToMove);
  return king != NO_SQUARE && isSquareAttacked(board, king, opposite(board.sideToMove));
}

// Legality is a property of the position *after* the move, so the only way to
// answer it is to play the move and look. That is why this needs make/unmake
// and the pseudo-legal generator does not.
//
// This is the slow, obviously-correct approach: every move is played. Engines
// eventually replace it with pin detection, which reasons about which pieces
// could possibly expose the king and skips the rest. That is an optimisation to
// make once perft says this version is right, not before.
std::vector<Move> generateLegalMoves(const Board& board) {
  const Color us = board.sideToMove;
  const Color them = opposite(us);
  const bool inCheck = isInCheck(board);

  // makeMove needs a board it may modify, and the caller's must come back
  // unchanged. One copy per call is the honest way to promise that. A search
  // would instead own a mutable board and never take this copy.
  Board working = board;

  std::vector<Move> legal;
  for (const Move& move : generatePseudoLegalMoves(board)) {
    // Castling is the one move with legality conditions of its own, and they
    // are about the position *before* the move, so they are tested first.
    //
    // Only the transit square is checked here. The starting square is covered
    // by inCheck and the destination by the general test below, which together
    // give the familiar "cannot castle out of, through, or into check". The
    // queenside b-file square is deliberately absent: the rook crosses it, the
    // king does not, and only the king's path matters.
    if (isCastle(move)) {
      if (inCheck) continue;
      const Square transit =
          makeSquare((fileOf(move.from) + fileOf(move.to)) / 2, rankOf(move.from));
      if (isSquareAttacked(board, transit, them)) continue;
    }

    const UndoRecord undo = makeMove(working, move);
    const Square king = findKing(working, us);
    const bool exposed = king != NO_SQUARE && isSquareAttacked(working, king, them);
    unmakeMove(working, move, undo);

    if (!exposed) legal.push_back(move);
  }

  return legal;
}
