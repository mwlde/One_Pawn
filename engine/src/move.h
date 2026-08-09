#pragma once

#include <string>

#include "board.h"

// A single move, in the form the generator produces and make/unmake will
// consume.
//
// This lives in its own header rather than in board.h because a move is not
// part of the position. board.h answers "what is on the board"; this answers
// "what can change". Search and evaluation will want moves without caring how
// squares are stored, and keeping them apart makes that boundary explicit.

// Which of the four irregular move rules applies. These are mutually exclusive,
// so one enum is more honest than four independent booleans: there is no such
// thing as a move that is both a castle and a double pawn push, and a bitfield
// would let that state exist.
//
// Capture is deliberately *not* a value here. A capture can coexist with a
// promotion or with en passant, so it lives in its own flag below.
enum class MoveKind {
  Normal,
  DoublePawnPush,
  EnPassant,
  CastleKingside,
  CastleQueenside,
};

// A promotion target is never a pawn, so Pawn doubles as "this move does not
// promote". Same reasoning as NO_SQUARE in board.h: a sentinel that cannot
// collide with a real value beats std::optional's ceremony at every use site.
constexpr PieceType NO_PROMOTION = PieceType::Pawn;

// Everything A2.2 needs to apply a move must be recoverable from the Move plus
// the Board it applies to. The three irregular cases are why kind exists:
//
//   EnPassant       the captured pawn is not on `to`. It is on the square with
//                   `to`'s file and `from`'s rank.
//   Castle*         a rook moves as well, on the same rank as the king.
//   DoublePawnPush  the square the pawn skipped becomes the next en passant
//                   target.
//
// The move does not carry the captured piece or the previous castling rights.
// Those are unmake's problem, and unmake will need an undo record anyway, so
// duplicating them here would only give two places to keep in sync.
struct Move {
  Square from = NO_SQUARE;
  Square to = NO_SQUARE;
  PieceType promotion = NO_PROMOTION;
  MoveKind kind = MoveKind::Normal;
  bool isCapture = false;
};

// Long algebraic notation: origin square, destination square, and a lowercase
// piece letter when the move promotes. e2e4, g1f3, e7e8q.
//
// Castling is written as the king's own move (e1g1), not O-O. Long algebraic is
// what UCI speaks, so this is the form the WASM layer will want later.
//
// The board is unused today. Long algebraic needs no context, unlike SAN, which
// has to inspect the position to work out whether "Nf3" is ambiguous. The
// parameter is here so that swapping in a SAN writer later does not change
// every call site.
std::string moveToString(const Move& move, const Board& board);
