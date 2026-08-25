#include "perft.h"

#include <iostream>
#include <vector>

#include "move.h"
#include "movegen.h"
#include "position.h"

uint64_t perft(Board& board, int depth) {
  // Depth 0 is one leaf: the position itself, reached by the empty sequence.
  // Returning 0 here would make every count zero, since the leaves are the only
  // thing that ever contributes.
  if (depth <= 0) return 1;

  uint64_t nodes = 0;
  for (const Move& move : generateLegalMoves(board)) {
    const UndoRecord undo = makeMove(board, move);
    nodes += perft(board, depth - 1);
    unmakeMove(board, move, undo);
  }
  return nodes;
}

void perftDivide(Board& board, int depth) {
  if (depth <= 0) {
    std::cout << "total: 1\n";
    return;
  }

  uint64_t total = 0;
  for (const Move& move : generateLegalMoves(board)) {
    // moveToString is called before the move is played. Long algebraic needs no
    // context today, but a SAN writer would, and it would need the position the
    // move was legal in rather than the one after it.
    const std::string name = moveToString(move, board);

    const UndoRecord undo = makeMove(board, move);
    const uint64_t nodes = perft(board, depth - 1);
    unmakeMove(board, move, undo);

    std::cout << name << ": " << nodes << '\n';
    total += nodes;
  }

  std::cout << "\ntotal: " << total << '\n';
}
