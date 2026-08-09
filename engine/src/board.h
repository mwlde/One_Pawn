#pragma once

#include <array>
#include <string>

// Board representation for the One Pawn engine.
//
// Squares are a flat 64-element array, rank-major with ascending files and
// ascending ranks: a1 = 0, h1 = 7, a8 = 56, h8 = 63.
//
//   index = rank * 8 + file       (rank 0 = rank 1, file 0 = the a-file)
//
// FEN writes ranks from 8 down to 1, so the FEN parser walks ranks backwards.
// That is the one place this convention costs anything, and it buys simple
// arithmetic everywhere else.

using Square = int;

// Sentinel for "no square". Used by the en passant field, which is absent in
// most positions. std::optional<Square> would say the same thing with more
// ceremony at every use site; a named sentinel is enough here.
constexpr Square NO_SQUARE = -1;

constexpr int BOARD_SIZE = 64;

enum class Color { White, Black };

enum class PieceType { Pawn, Knight, Bishop, Rook, Queen, King };

// One value per square, colour and type combined.
//
// The alternative is a PieceType array plus a parallel Color array, which
// forces an answer to "what colour is an empty square?" on every read. A single
// enum makes Empty a first-class value and keeps the board one array.
//
// Values are laid out deliberately: White pieces occupy 1-6 and Black 7-12, in
// PieceType order. pieceColor and pieceType recover the two halves by
// arithmetic rather than a twelve-branch switch.
enum class Piece {
  Empty = 0,
  WhitePawn = 1,
  WhiteKnight,
  WhiteBishop,
  WhiteRook,
  WhiteQueen,
  WhiteKing,
  BlackPawn = 7,
  BlackKnight,
  BlackBishop,
  BlackRook,
  BlackQueen,
  BlackKing
};

// Four independent flags rather than a 4-bit mask. Castling logic is fiddly and
// gets read far more often than it gets written, so named fields win over bit
// tests. A mask is a Phase 2 optimisation at the earliest.
struct CastlingRights {
  bool whiteKingside = false;
  bool whiteQueenside = false;
  bool blackKingside = false;
  bool blackQueenside = false;
};

// The complete position, matching the six fields FEN encodes. A position is not
// just the pieces: the same piece layout with different castling rights or a
// different side to move is a different position.
struct Board {
  std::array<Piece, BOARD_SIZE> squares{};  // value-initialised to Piece::Empty
  Color sideToMove = Color::White;
  CastlingRights castling{};
  Square enPassantTarget = NO_SQUARE;  // the square a pawn may capture onto
  int halfmoveClock = 0;               // plies since last capture or pawn move
  int fullmoveNumber = 1;              // increments after each Black move
};

// Piece encoding helpers. Behaviour on Piece::Empty is undefined for
// pieceColor and pieceType, so guard with isEmpty first.
bool isEmpty(Piece piece);
Color pieceColor(Piece piece);
PieceType pieceType(Piece piece);
Piece makePiece(Color color, PieceType type);

// The other side. Sits here beside the piece helpers because both make/unmake
// and legality checking need it, and a private copy in each was one too many.
Color opposite(Color color);

// Square helpers. file and rank are both 0-7.
Square makeSquare(int file, int rank);
int fileOf(Square square);
int rankOf(Square square);

// "e4" style algebraic name. Returns "-" for NO_SQUARE.
std::string squareName(Square square);

// Builds a Board from a FEN string. All six FEN fields are required.
//
// Throws std::invalid_argument with a human-readable message if the FEN is
// malformed. Returning by value means a failed parse yields no Board at all,
// rather than a half-filled one the caller might use by mistake.
Board parseFen(const std::string& fen);

// Prints the full position to stdout: the eight ranks with file and rank
// labels, then side to move, castling rights, en passant target and both
// counters. Writing to std::cout directly keeps the header free of <ostream>;
// if A2 needs to capture the output for tests, add an std::ostream& parameter
// then.
void printBoard(const Board& board);
