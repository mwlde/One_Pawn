#include "movegen.h"

#include <array>

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

Move makeMove(Square from, Square to, bool isCapture) {
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
        moves.push_back(makeMove(from, to, false));
      } else {
        if (pieceColor(target) != us) {
          moves.push_back(makeMove(from, to, true));
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
      moves.push_back(makeMove(from, to, false));
    } else if (pieceColor(target) != us) {
      moves.push_back(makeMove(from, to, true));
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
    addPawnMove(makeMove(from, push, false), geometry.promotionRank, moves);

    // Both squares must be empty. A pawn does not jump.
    if (rank == geometry.startRank) {
      const Square doublePush = makeSquare(file, rank + 2 * geometry.forward);
      if (isEmpty(board.squares[doublePush])) {
        Move move = makeMove(from, doublePush, false);
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
      addPawnMove(makeMove(from, to, true), geometry.promotionRank, moves);
    } else if (to == board.enPassantTarget) {
      // The en passant target square is empty, so the ordinary capture test
      // above can never produce this move. The captured pawn sits beside the
      // mover, on the target's file and the mover's rank.
      Move move = makeMove(from, to, true);
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

  if (kingside && squareIsEmpty(5) && squareIsEmpty(6)) {
    Move move = makeMove(from, makeSquare(6, homeRank), false);
    move.kind = MoveKind::CastleKingside;
    moves.push_back(move);
  }

  // b1 must be empty as well. The rook passes over it, even though the king
  // does not, which is why this side checks three squares and not two.
  if (queenside && squareIsEmpty(1) && squareIsEmpty(2) && squareIsEmpty(3)) {
    Move move = makeMove(from, makeSquare(2, homeRank), false);
    move.kind = MoveKind::CastleQueenside;
    moves.push_back(move);
  }
}

}  // namespace

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
