#pragma once

#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>

#include "board.h"
#include "move.h"
#include "movegen.h"

// A test harness in a hundred lines, deliberately.
//
// The project already has Vitest for TypeScript and CLAUDE.md rules out a third
// framework. On the C++ side a framework would buy test discovery and assertion
// macros, and charge a dependency, a build step and a vocabulary for them. With
// a handful of test files, a counter and a non-zero exit code do the same work.
//
// Everything here is inline so the header can be included by every test file
// without a matching .cpp. C++17 inline variables mean the counters exist once
// across the whole binary rather than once per translation unit.

inline int checksRun = 0;
inline int checksFailed = 0;

// Groups output. Purely cosmetic: a failure prints its own description, so the
// section is there to make a long passing run readable.
inline void section(const std::string& name) { std::cout << "\n" << name << "\n"; }

inline void check(bool passed, const std::string& what) {
  ++checksRun;
  if (passed) {
    std::cout << "  pass  " << what << "\n";
    return;
  }
  ++checksFailed;
  std::cout << "  FAIL  " << what << "\n";
}

// The two-argument form exists so a failure can print what it got as well as
// what it wanted. `check(a == b, ...)` cannot, and "FAIL round-trip" without the
// two values is a message that sends you back to the debugger anyway.
//
// Two type parameters rather than one, so a uint64_t may be compared against a
// plain int without the call site casting. Both are streamed, so anything with
// an operator<< works. Mixing signed and unsigned still warns under -Wextra,
// which is the compiler being right: write 4u, not 4, when checking a size.
template <typename Actual, typename Expected>
void checkEqual(const Actual& actual, const Expected& expected, const std::string& what) {
  ++checksRun;
  if (actual == expected) {
    std::cout << "  pass  " << what << "\n";
    return;
  }
  ++checksFailed;
  std::cout << "  FAIL  " << what << "\n";
  std::cout << "        expected: " << expected << "\n";
  std::cout << "        actual:   " << actual << "\n";
}

// Exit code for main: 0 only if everything passed. This is what makes the suite
// usable from a script or, later, from CI.
inline int report() {
  std::cout << "\n" << (checksRun - checksFailed) << "/" << checksRun << " checks passed\n";
  if (checksFailed > 0) std::cout << checksFailed << " FAILED\n";
  return checksFailed == 0 ? 0 : 1;
}

// Every field of a Board, flattened into one comparable, printable string.
//
// This is the whole point of the make/unmake tests. Comparing boards field by
// field needs an operator== that Board does not have and does not need in the
// engine itself. Comparing signatures gives equality and a readable diff from
// the same helper, and a mismatch shows which field drifted rather than just
// reporting "not equal".
//
// The piece letters duplicate a private helper in board.cpp. Exporting that one
// would widen board.h's interface for the sake of a test, which is a worse
// trade than five lines repeated here.
inline std::string boardSignature(const Board& board) {
  std::ostringstream out;

  for (int rank = 7; rank >= 0; --rank) {
    for (int file = 0; file < 8; ++file) {
      const Piece piece = board.squares[makeSquare(file, rank)];
      if (isEmpty(piece)) {
        out << '.';
        continue;
      }
      const char symbol = "PNBRQK"[static_cast<int>(pieceType(piece))];
      out << static_cast<char>(pieceColor(piece) == Color::White ? symbol : symbol + ('a' - 'A'));
    }
    out << '/';
  }

  out << ' ' << (board.sideToMove == Color::White ? 'w' : 'b');
  out << ' ' << (board.castling.whiteKingside ? 'K' : '-')
      << (board.castling.whiteQueenside ? 'Q' : '-') << (board.castling.blackKingside ? 'k' : '-')
      << (board.castling.blackQueenside ? 'q' : '-');
  out << ' ' << squareName(board.enPassantTarget);
  out << ' ' << board.halfmoveClock;
  out << ' ' << board.fullmoveNumber;

  return out.str();
}

// Looks up a legal move by its long algebraic name: "e2e4", "e7e8q", "e1g1".
//
// Tests name moves the way a person would rather than building a Move field by
// field, which would mean each test restating the MoveKind and capture flag the
// generator is supposed to work out for itself. Going through
// generateLegalMoves also means a test can only ever play a move the generator
// actually produced.
//
// Throws if there is no such move. A test asking for a move that does not exist
// is a broken test, and returning a default Move would let it run on and index
// the board with NO_SQUARE. test_main.cpp catches this and counts it as a
// failure.
inline Move requireMove(const Board& board, const std::string& notation) {
  for (const Move& move : generateLegalMoves(board)) {
    if (moveToString(move, board) == notation) return move;
  }
  throw std::invalid_argument("no legal move '" + notation + "' in this position");
}

// Each test file exposes one of these. test_main.cpp calls all of them, so
// adding a file means adding a declaration here and a line there.
void runMakeUnmakeTests();
void runAttackTests();
void runPerftTests();
void runEvaluateTests();
void runSearchTests();
