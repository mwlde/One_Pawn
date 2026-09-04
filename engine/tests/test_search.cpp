#include <string>
#include <vector>

#include "board.h"
#include "evaluate.h"
#include "movegen.h"
#include "search.h"
#include "test_harness.h"

// Search tests.
//
// Almost every case here is a position whose correct answer is forced, because
// those are the only search results that can be asserted. "The engine should
// prefer developing a piece" is not a test: it depends on the evaluator, which
// is a stub in A3.1 and will be replaced in A4, and a test that changes its
// expected value whenever the evaluator changes is testing nothing.
//
// Mates and stalemates are different. They are facts about the rules, not about
// the evaluation, so they stay true through every future stage. The same goes
// for the structural properties: that the search returns a legal move, and that
// it hands the board back as it found it.

namespace {

// True if `move` is one the generator actually produced for this position.
//
// Compared by notation rather than field by field, because Move has no
// operator== and does not need one in the engine itself. The same reasoning as
// boardSignature in the harness.
bool isLegalHere(const Board& board, const Move& move) {
  const std::string notation = moveToString(move, board);
  for (const Move& candidate : generateLegalMoves(board)) {
    if (moveToString(candidate, board) == notation) return true;
  }
  return false;
}

}  // namespace

void runSearchTests() {
  section("search");

  {
    // Back-rank mate: the black king on g8 is walled in by its own pawns, so
    // Ra8 ends it. Depth 2 rather than 1, so the search has to see Black's
    // reply, or rather see that Black has none.
    //
    // The score is the mate-distance encoding at work. The mate happens at ply
    // 1, so the mated side scores -(MATE_SCORE - 1) and the root, negating,
    // reports 29999. A plain MATE_SCORE here would mean the encoding was not
    // applied and the engine could not tell a fast mate from a slow one.
    Board board = parseFen("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");
    const Move best = findBestMove(board, 2);

    checkEqual(moveToString(best, board), std::string("a1a8"), "mate in 1 is found");
    checkEqual(lastSearchScore(), MATE_SCORE - 1, "mate in 1 scores MATE_SCORE - 1");
  }

  {
    // Stalemate at the root. Black has no legal move and is not in check, so
    // the game is drawn and the score is zero however much material is on the
    // board. White is a queen up here, which is the point: a search that
    // returned material would say +900 for White, and this is Black to move.
    Board board = parseFen("k7/8/1Q6/2K5/8/8/8/8 b - - 0 1");
    const Move best = findBestMove(board, 4);

    check(isNullMove(best), "stalemate returns no move");
    checkEqual(lastSearchScore(), 0, "stalemate scores 0");
  }

  {
    // Checkmate at the root. Mated at ply 0, so the distance adjustment
    // subtracts nothing and the score is the full -MATE_SCORE.
    Board board = parseFen("k7/1Q6/1K6/8/8/8/8/8 b - - 0 1");
    const Move best = findBestMove(board, 4);

    check(isNullMove(best), "being mated returns no move");
    checkEqual(lastSearchScore(), -MATE_SCORE, "being mated scores -MATE_SCORE");
  }

  {
    // Depth 0 is a request for the static verdict, not for a move. The score
    // must be evaluate's, untouched: if the root fell through to its move loop
    // it would search one ply and return a different number.
    //
    // A position with an imbalance, so that a search of any depth would
    // disagree with the static score and the check can tell.
    Board board = parseFen("r1bq2k1/ppp2pbp/2n1p3/3p4/3P4/2N1B3/PP3PPP/R2Q1RK1 w - - 0 12");
    const Move best = findBestMove(board, 0);

    check(isNullMove(best), "depth 0 returns no move");
    checkEqual(lastSearchScore(), evaluate(board), "depth 0 returns the static evaluation");
  }

  {
    // The structural guarantee, at every depth the suite can afford. Whatever
    // the evaluator says, the move handed back must be one the rules allow.
    // This is the check that survives A4 unchanged.
    for (int depth = 1; depth <= 4; ++depth) {
      Board board = parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      const Move best = findBestMove(board, depth);

      check(!isNullMove(best) && isLegalHere(board, best),
            "starting position returns a legal move at depth " + std::to_string(depth));
    }
  }

  {
    // The board comes back as it went in. Search plays thousands of moves on
    // the caller's board and every one must be taken back, including on the
    // paths cut short by a beta cutoff. A missed unmake there is the classic
    // alpha-beta bug, and it corrupts the position silently rather than
    // crashing.
    Board board = parseFen("r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3");
    const std::string before = boardSignature(board);
    findBestMove(board, 3);

    checkEqual(boardSignature(board), before, "search restores the caller's board");
  }

  {
    // Determinism. No randomness, no time limit, and a generator whose move
    // order is fixed, so the same position searched twice must give the same
    // move, the same score and the same node count. The node count is the
    // strictest of the three: it would catch a difference in the tree explored
    // even if the chosen move happened to match.
    Board board = parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

    const std::string firstMove = moveToString(findBestMove(board, 3), board);
    const int firstScore = lastSearchScore();
    const uint64_t firstNodes = lastSearchNodes();

    const std::string secondMove = moveToString(findBestMove(board, 3), board);

    checkEqual(secondMove, firstMove, "search is deterministic: same move");
    checkEqual(lastSearchScore(), firstScore, "search is deterministic: same score");
    checkEqual(lastSearchNodes(), firstNodes, "search is deterministic: same node count");
  }
}
