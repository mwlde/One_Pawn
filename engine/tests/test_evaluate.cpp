#include <string>
#include <vector>

#include "board.h"
#include "evaluate.h"
#include "test_harness.h"

// Evaluation tests for the A3.1 material-only evaluator.
//
// Unlike perft, these numbers are ours. There is no external authority on what
// a position "should" score, because the piece values are a choice. So each
// case is one whose material can be counted by hand off the FEN, and the
// expected value is that count, written out below the case. A test whose
// expected value was produced by running the code would only ever confirm that
// the code still does what it did.
//
// The cases are chosen around the two things that are easy to get wrong: the
// arithmetic, and the sign. Positions appear in pairs differing only in the
// side-to-move field, which is the one field material evaluation ignores and
// the perspective flip does not.

namespace {

struct EvalCase {
  const char* name;
  const char* fen;
  int expected;  // centipawns, from the perspective of the side to move
};

const std::vector<EvalCase>& evalCases() {
  static const std::vector<EvalCase> cases = {
      // Symmetric, so every piece value cancels regardless of what the values
      // are. This catches a sign error in the accumulation loop, not a wrong
      // number in the table.
      {"starting position is equal", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 0},

      // The starting position with White's queen removed from d1. Down 900
      // from White's point of view.
      {"white missing queen, white to move",
       "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1", -900},

      // The same board, only the side-to-move field changed. The score must
      // invert, because the score is relative to whoever is on move. This is
      // the pair that proves the negamax convention, and it is the reason both
      // halves are listed rather than just the first.
      {"white missing queen, black to move",
       "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1", 900},

      // Kings only. Zero because the king is worth 0 and both sides have one:
      // a non-zero king value would still cancel here, so what this really
      // pins down is that an almost-empty board does not accumulate anything
      // from its empty squares.
      {"bare kings", "4k3/8/8/8/8/8/8/4K3 w - - 0 1", 0},

      // A middlegame position with a genuine imbalance, so the pawn, rook and
      // bishop values are each exercised and cannot cancel out:
      //
      //   pawns    W 6 (600)   B 7 (700)    -100
      //   rooks    W 2 (1000)  B 1 (500)    +500
      //   bishops  W 1 (330)   B 2 (660)    -330
      //   knights  W 1         B 1             0
      //   queens   W 1         B 1             0
      //                                     ------
      //                                       +70
      //
      // White is up the exchange, Black is up a pawn and holds the bishop
      // pair. The three terms have different signs, so a swapped rook and
      // bishop value or a dropped minus sign moves the total.
      {"middlegame, white up the exchange, white to move",
       "r1bq2k1/ppp2pbp/2n1p3/3p4/3P4/2N1B3/PP3PPP/R2Q1RK1 w - - 0 12", 70},
      {"middlegame, white up the exchange, black to move",
       "r1bq2k1/ppp2pbp/2n1p3/3p4/3P4/2N1B3/PP3PPP/R2Q1RK1 b - - 0 12", -70},
  };
  return cases;
}

}  // namespace

void runEvaluateTests() {
  section("evaluation");

  for (const EvalCase& testCase : evalCases()) {
    const Board board = parseFen(testCase.fen);
    checkEqual(evaluate(board), testCase.expected, testCase.name);
  }
}
