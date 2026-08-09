#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "board.h"
#include "move.h"
#include "movegen.h"

namespace {

const char* const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const char* const PSEUDO_FLAG = "--pseudo";

// A FEN contains spaces, so an unquoted one arrives split across several argv
// entries. Rejoining them means both quoted and unquoted invocations behave
// identically. This does not weaken the parser: a rejoined string is still
// checked field by field, so trailing junk is still rejected.
//
// The flag is filtered out wherever it appears, so it may sit before or after
// the FEN. Anything else is treated as part of the FEN and the parser rejects
// it if it is not, which keeps a mistyped flag from being silently ignored.
std::string joinArguments(int argc, char* argv[], bool& pseudo) {
  std::string joined;
  for (int i = 1; i < argc; ++i) {
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

}  // namespace

int main(int argc, char* argv[]) {
  bool pseudo = false;
  const std::string joined = joinArguments(argc, argv, pseudo);
  const std::string fen = joined.empty() ? STARTING_FEN : joined;

  try {
    const Board board = parseFen(fen);
    printBoard(board);
    printMoves(board, pseudo);
  } catch (const std::invalid_argument& error) {
    // Diagnostics go to stderr so that piping stdout to a file still shows the
    // error, and so a caller parsing the board output never sees it.
    std::cerr << "error: " << error.what() << '\n';
    std::cerr << "usage: onepawn-engine [--pseudo] [FEN]\n";
    std::cerr << "       with no FEN, the starting position is used\n";
    std::cerr << "       --pseudo lists pseudo-legal moves instead of legal ones\n";
    return 1;
  }

  return 0;
}
