#include "search.h"

#include <vector>

#include "evaluate.h"
#include "movegen.h"
#include "position.h"

namespace {

// One past the largest magnitude any score can take, so it is a safe starting
// bound. Alpha begins below every reachable score and beta above every one,
// which is what "no constraint yet" means in this algorithm.
//
// MATE_SCORE + 1 rather than INT_MAX, because these values get negated on every
// recursive call and INT_MIN has no positive counterpart. Negating it is
// undefined behaviour, and it is the classic way to break a first negamax.
constexpr int INFINITE_SCORE = MATE_SCORE + 1;

// Nodes visited by the current search, and the score it settled on.
//
// thread_local rather than a plain global: see the note in search.h. Both are
// written only through findBestMove, which resets them before it starts.
thread_local uint64_t nodeCount = 0;
thread_local int rootScore = 0;

// The heart of it.
//
// Returns the score of this position from the point of view of the side to
// move, in the same units and the same convention as evaluate.
//
// **Why one function handles both sides.** Chess is zero-sum: a position that
// is worth +300 to me is worth exactly -300 to you. So there is no need for
// separate "maximising" and "minimising" routines. Ask the child for its score
// from its own perspective and negate it, and the answer is in mine. That
// identity is the whole of negamax, and it is why every recursive call below is
// written with a leading minus sign.
//
// **What alpha and beta mean.** They are the window of scores still worth
// knowing about, and neither is a guess about this position.
//
//   alpha  the best I have already secured somewhere else in the tree. A move
//          scoring below this is irrelevant: I would simply play the other
//          line instead. It is a lower bound, and it only ever rises.
//   beta   the best my opponent has already secured one ply up. If a move here
//          scores at or above it, my opponent will avoid this whole position,
//          so its exact value never matters. It is an upper bound.
//
// The window inverts on the way down, which is the same sign flip again: my
// lower bound is my opponent's upper bound. So the child is called with
// (-beta, -alpha), and the two arguments swap places as well as sign.
//
// **What alpha-beta does not do.** It never changes the answer. The move it
// returns is the move plain negamax would return, and the score is the same
// score. All it does is stop searching branches whose result provably cannot
// affect either. That is worth saying plainly, because a search bug and a
// pruning bug look identical from outside: both give a wrong move.
//
// `ply` counts distance from the root, not remaining depth. It exists only for
// mate scoring, which needs to know how far away a mate is, and `depth` cannot
// answer that: a mate found at depth 1 of a 6-ply search is five plies from the
// root, not one.
int negamax(Board& board, int depth, int alpha, int beta, int ply) {
  ++nodeCount;

  // The leaf. No move generation here, deliberately: generating moves only to
  // throw them away is the single most expensive thing a search can do, and
  // leaves are the overwhelming majority of nodes.
  //
  // The cost of that choice is that a checkmate sitting exactly at the horizon
  // is scored as ordinary material. The search still finds every mate one ply
  // shallower, so this costs nothing at the depths that matter and buys the
  // largest single saving available without move ordering.
  if (depth <= 0) return evaluate(board);

  const std::vector<Move> moves = generateLegalMoves(board);

  // No legal moves means the game ended here, and the two ways that happens
  // could not be further apart in value. The move list cannot tell them apart,
  // so ask the board.
  if (moves.empty()) {
    // Checkmate. Negative because it is the side to move who is mated, and
    // every score in this function is from their point of view. The ply term is
    // the mate-distance adjustment described in search.h: a mate five plies
    // away scores 29995, worse than the 29999 of a mate in one, so the search
    // prefers the quick kill and, mirrored, the slow death.
    if (isInCheck(board)) return -(MATE_SCORE - ply);

    // Stalemate. A draw is worth zero regardless of the material on the board,
    // which is why a queen ahead and stalemated scores the same as bare kings.
    return 0;
  }

  for (const Move& move : moves) {
    const UndoRecord undo = makeMove(board, move);
    const int score = -negamax(board, depth - 1, -beta, -alpha, ply + 1);
    unmakeMove(board, move, undo);

    if (score > alpha) alpha = score;

    // The beta cutoff. This move is at least as good for me as something my
    // opponent could already guarantee for themselves one ply up, so they will
    // never let the game reach this position. Whatever the remaining moves
    // score, the answer here is already too good to be used, and searching them
    // cannot change any decision above.
    //
    // The value returned is a bound, not the true score of this position: the
    // truth may be higher, and we stopped before finding out. That is fine
    // while nothing stores it. It becomes something to be careful about the
    // moment a transposition table caches scores, which is why engines label
    // stored entries as exact, lower or upper bounds.
    if (alpha >= beta) return alpha;
  }

  return alpha;
}

}  // namespace

bool isNullMove(const Move& move) { return move.from == NO_SQUARE; }

int lastSearchScore() { return rootScore; }

uint64_t lastSearchNodes() { return nodeCount; }

Move findBestMove(Board& board, int depth) {
  nodeCount = 0;
  rootScore = 0;

  // The root is a separate loop rather than another negamax call, because it
  // wants something negamax never tracks: which move produced the best score.
  // Threading a "best move" out-parameter through every ply would cost a write
  // at every node to serve one of them.

  // Zero plies is a request for the static verdict. Falling through would
  // instead search every root move at depth -1, which is a one-ply search and
  // not what was asked for.
  if (depth <= 0) {
    rootScore = evaluate(board);
    return Move{};
  }

  const std::vector<Move> moves = generateLegalMoves(board);
  if (moves.empty()) {
    rootScore = isInCheck(board) ? -MATE_SCORE : 0;  // ply is 0 at the root
    return Move{};
  }

  // A full window: nothing is known yet, so nothing can be pruned against.
  int alpha = -INFINITE_SCORE;
  Move best = Move{};

  for (const Move& move : moves) {
    const UndoRecord undo = makeMove(board, move);

    // Beta stays at +INFINITE_SCORE for every root move. There is no ply above
    // the root to cut against, and narrowing the window here would return a
    // bound rather than a score, which is exactly the value being reported to
    // the user.
    const int score = -negamax(board, depth - 1, -INFINITE_SCORE, -alpha, 1);

    unmakeMove(board, move, undo);

    // Strictly greater, so the first of several equal moves wins. That is what
    // makes the search deterministic: the generator's order is fixed, so the
    // same position always yields the same move. The initial alpha is below
    // every reachable score, so the first move always takes the slot and `best`
    // is never left null.
    if (score > alpha) {
      alpha = score;
      best = move;
    }
  }

  rootScore = alpha;
  return best;
}
