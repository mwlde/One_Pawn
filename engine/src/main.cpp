#include <iostream>
#include <stdexcept>
#include <string>

#include "board.h"

namespace {

const char* const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// A FEN contains spaces, so an unquoted one arrives split across several argv
// entries. Rejoining them means both quoted and unquoted invocations behave
// identically. This does not weaken the parser: a rejoined string is still
// checked field by field, so trailing junk is still rejected.
std::string joinArguments(int argc, char* argv[]) {
  std::string joined;
  for (int i = 1; i < argc; ++i) {
    if (i > 1) joined += ' ';
    joined += argv[i];
  }
  return joined;
}

}  // namespace

int main(int argc, char* argv[]) {
  const std::string fen = (argc > 1) ? joinArguments(argc, argv) : STARTING_FEN;

  try {
    const Board board = parseFen(fen);
    printBoard(board);
  } catch (const std::invalid_argument& error) {
    // Diagnostics go to stderr so that piping stdout to a file still shows the
    // error, and so a caller parsing the board output never sees it.
    std::cerr << "error: " << error.what() << '\n';
    std::cerr << "usage: onepawn-engine [FEN]\n";
    std::cerr << "       with no argument, the starting position is used\n";
    return 1;
  }

  return 0;
}
