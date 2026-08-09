#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "board.h"
#include "move.h"
#include "movegen.h"

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

// One move per line, preceded by a count. These are pseudo-legal moves, so some
// of them may leave the king in check. The label says so, because a count that
// silently disagrees with a published perft number is worth an explanation.
void printMoves(const Board& board) {
  const std::vector<Move> moves = generatePseudoLegalMoves(board);

  std::cout << '\n'
            << "Pseudo-legal moves for " << (board.sideToMove == Color::White ? "White" : "Black")
            << ": " << moves.size() << '\n';

  for (const Move& move : moves) {
    std::cout << "  " << moveToString(move, board) << '\n';
  }
}

}  // namespace

int main(int argc, char* argv[]) {
  const std::string fen = (argc > 1) ? joinArguments(argc, argv) : STARTING_FEN;

  try {
    const Board board = parseFen(fen);
    printBoard(board);
    printMoves(board);
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
