#pragma once

#include "board.h"
#include "move.h"

// Applying moves to a position and taking them back.
//
// This is a separate header from movegen.h because the two do opposite things.
// generatePseudoLegalMoves reads a Board and never touches it; makeMove exists
// entirely to mutate one. Keeping the mutating API apart makes it obvious at a
// call site which of the two is happening.
//
// It cannot live in board.h either. board.h knows nothing about moves, and
// move.h already includes board.h. Declaring makeMove in board.h would make the
// two headers include each other.
//
// The dependency runs one way: movegen.cpp will include this in A2.2.4, because
// the only way to know whether a move is legal is to play it and look.

// Everything needed to reverse a move, and nothing more.
//
// Four fields, because four things are genuinely unrecoverable once the move is
// on the board:
//
//   capturedPiece  the board has overwritten it. For en passant this is the
//                  pawn taken from beside the mover, not from the `to` square.
//   castling       rights only ever go away, so the old value cannot be
//                  reconstructed from the new one.
//   enPassantTarget likewise: make clears it, and nothing records what it was.
//   halfmoveClock  a reset to zero destroys the count.
//
// Two fields are deliberately absent. sideToMove just flips back. fullmoveNumber
// increments only after Black moves, and unmake knows who moved (it is whoever
// is *not* to move once make has run), so it can undo that itself. Storing
// derivable state means two sources of truth and a chance for them to disagree.
//
// The captured piece's *square* is not stored either. The Move's kind says
// whether it was the `to` square or the en passant square, which is exactly the
// job MoveKind was given in A2.1.
struct UndoRecord {
  Piece capturedPiece = Piece::Empty;
  CastlingRights castling{};
  Square enPassantTarget = NO_SQUARE;
  int halfmoveClock = 0;
};

// Plays `move` on `board` and returns what is needed to take it back.
//
// Returning the record rather than filling an out-parameter means it can never
// be used uninitialised, and recursion gives each ply its own record for free:
//
//   const UndoRecord undo = makeMove(board, move);
//   ... look at the position, recurse ...
//   unmakeMove(board, move, undo);
//
// Returning by value costs nothing here. The compiler constructs the record
// directly in the caller's variable rather than copying it out, which is
// guaranteed for a returned temporary since C++17 and applied in practice to
// named locals too.
//
// [[nodiscard]] makes ignoring the return a compiler warning. That is the bug
// worth catching: a move played with no way to take it back.
//
// Precondition: `move` came from generatePseudoLegalMoves for this exact
// position. It is not validated.
[[nodiscard]] UndoRecord makeMove(Board& board, const Move& move);

// Restores the position that makeMove was given.
//
// `move` and `undo` must be the same pair make was called with. Passing a
// mismatched pair corrupts the board silently, which is why the two are never
// separated in the call pattern above.
void unmakeMove(Board& board, const Move& move, const UndoRecord& undo);
