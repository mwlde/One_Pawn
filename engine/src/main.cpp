#include <chrono>
#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "board.h"
#include "evaluate.h"
#include "move.h"
#include "movegen.h"
#include "perft.h"

namespace {

const char* const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const char* const PSEUDO_FLAG = "--pseudo";
const char* const PERFT_COMMAND = "perft";
const char* const DIVIDE_COMMAND = "perft-divide";
const char* const EVAL_COMMAND = "eval";

// A FEN contains spaces, so an unquoted one arrives split across several argv
// entries. Rejoining them means both quoted and unquoted invocations behave
// identically. This does not weaken the parser: a rejoined string is still
// checked field by field, so trailing junk is still rejected.
//
// The flag is filtered out wherever it appears, so it may sit before or after
// the FEN. Anything else is treated as part of the FEN and the parser rejects
// it if it is not, which keeps a mistyped flag from being silently ignored.
//
// `first` is where the FEN may begin. It skips whatever the subcommand already
// consumed, so "perft 4 8/8/..." does not try to parse "perft 4" as placement.
std::string joinArguments(int argc, char* argv[], int first, bool& pseudo) {
  std::string joined;
  for (int i = first; i < argc; ++i) {
    const std::string argument = argv[i];
    if (argument == PSEUDO_FLAG) {
      pseudo = true;
      continue;
    }
    if (!joined.empty()) joined += ' ';
    joined += argument;
  }
  return joined;
}

// One move per line, preceded by a count.
void printMoves(const Board& board, bool pseudo) {
  const std::vector<Move> moves =
      pseudo ? generatePseudoLegalMoves(board) : generateLegalMoves(board);

  std::cout << '\n'
            << (pseudo ? "Pseudo-legal" : "Legal") << " moves for "
            << (board.sideToMove == Color::White ? "White" : "Black") << ": " << moves.size();

  // Only meaningful for the legal list. A pseudo-legal count of zero says
  // nothing about the game being over.
  if (!pseudo) {
    if (isInCheck(board)) std::cout << (moves.empty() ? "  (checkmate)" : "  (check)");
    else if (moves.empty()) std::cout << "  (stalemate)";
  }
  std::cout << '\n';

  for (const Move& move : moves) {
    std::cout << "  " << moveToString(move, board) << '\n';
  }
}

// Shared by both perft subcommands: the first argument after the command is the
// depth, and everything after that is the FEN.
//
// Throws invalid_argument on a bad depth so that main's existing catch reports
// it the same way it reports a bad FEN.
int parseDepth(const std::string& text) {
  size_t consumed = 0;
  int depth = 0;

  // stoi has three ways of failing and only one of them is an exception this
  // code would otherwise see: it throws invalid_argument for text with no
  // digits, throws out_of_range for digits too large for an int, and quietly
  // stops early for "4x", reporting how much it consumed. All three mean the
  // same thing to a caller, so they are folded into one message that repeats
  // the argument back. stoi's own messages ("stoi: no conversion") name a
  // function the user did not call.
  try {
    depth = std::stoi(text, &consumed);
  } catch (const std::logic_error&) {
    consumed = 0;
  }

  if (text.empty() || consumed != text.size() || depth < 0) {
    throw std::invalid_argument("invalid depth '" + text + "': expected a non-negative integer");
  }
  return depth;
}

void runPerft(Board& board, int depth, bool divide) {
  // steady_clock, not system_clock. This measures an interval, and system_clock
  // can be adjusted mid-run by NTP, which would make a fast run look slow or
  // negative. steady_clock only ever moves forwards.
  const auto start = std::chrono::steady_clock::now();

  uint64_t nodes = 0;
  if (divide) {
    perftDivide(board, depth);
  } else {
    nodes = perft(board, depth);
  }

  const std::chrono::duration<double> elapsed = std::chrono::steady_clock::now() - start;

  if (!divide) std::cout << "perft(" << depth << ") = " << nodes << '\n';
  std::cout << "time: " << elapsed.count() << "s\n";
}

// The sign is only meaningful alongside whose turn it is, so both are printed.
// A bare "-900" reads as "Black is winning" to anyone who has not just read
// evaluate.h, and it means that only when White is to move.
void printEvaluation(const Board& board) {
  const char* const side = (board.sideToMove == Color::White) ? "White" : "Black";
  std::cout << "evaluation: " << evaluate(board) << " centipawns, " << side << " to move\n";
}

void printUsage() {
  std::cerr << "usage: onepawn-engine [--pseudo] [FEN]\n";
  std::cerr << "       onepawn-engine perft <depth> [FEN]\n";
  std::cerr << "       onepawn-engine perft-divide <depth> [FEN]\n";
  std::cerr << "       onepawn-engine eval [FEN]\n";
  std::cerr << "       with no FEN, the starting position is used\n";
  std::cerr << "       --pseudo lists pseudo-legal moves instead of legal ones\n";
}

}  // namespace

int main(int argc, char* argv[]) {
  const std::string command = (argc > 1) ? argv[1] : "";
  const bool isPerft = (command == PERFT_COMMAND || command == DIVIDE_COMMAND);

  try {
    if (command == EVAL_COMMAND) {
      bool ignored = false;  // --pseudo means nothing here; evaluation lists no moves
      const std::string joined = joinArguments(argc, argv, 2, ignored);
      const Board board = parseFen(joined.empty() ? STARTING_FEN : joined);

      printEvaluation(board);
      return 0;
    }

    if (isPerft) {
      if (argc < 3) {
        throw std::invalid_argument(command + " needs a depth");
      }
      const int depth = parseDepth(argv[2]);

      bool ignored = false;  // --pseudo means nothing here; perft counts legal moves
      const std::string joined = joinArguments(argc, argv, 3, ignored);
      Board board = parseFen(joined.empty() ? STARTING_FEN : joined);

      runPerft(board, depth, command == DIVIDE_COMMAND);
      return 0;
    }

    bool pseudo = false;
    const std::string joined = joinArguments(argc, argv, 1, pseudo);
    const Board board = parseFen(joined.empty() ? STARTING_FEN : joined);
    printBoard(board);
    printMoves(board, pseudo);
  } catch (const std::invalid_argument& error) {
    // Diagnostics go to stderr so that piping stdout to a file still shows the
    // error, and so a caller parsing the board output never sees it.
    std::cerr << "error: " << error.what() << '\n';
    printUsage();
    return 1;
  }

  return 0;
}
