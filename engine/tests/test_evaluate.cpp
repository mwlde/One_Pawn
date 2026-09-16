#include <string>
#include <vector>

#include "board.h"
#include "evaluate.h"
#include "test_harness.h"

// Evaluation tests: material plus piece-square tables.
//
// Unlike perft, these numbers are ours. There is no external authority on what
// a position "should" score, because the piece values and table entries are a
// choice. So each case is one that can be counted by hand off the FEN and the
// tables in evaluate.cpp, and the count is written out beside the case. A test
// whose expected value was produced by running the code would only ever confirm
// that the code still does what it did.
//
// The cases are chosen around the things that are easy to get wrong: the
// arithmetic, the sign, the black mirror and the king's phase. Positions appear
// in pairs differing in one thing only, so a failure points at that thing.

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

      // The starting position with White's queen removed from d1. The queen on
      // d1 was worth 900 material and -5 on its table, so White is down 895.
      // Black still has a queen and every piece, so the kings use the
      // middlegame table, where e1 and e8 are both 0.
      {"white missing queen, white to move",
       "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1", -895},

      // The same board, only the side-to-move field changed. The score must
      // invert, because the score is relative to whoever is on move. This is
      // the pair that proves the negamax convention, and it is the reason both
      // halves are listed rather than just the first.
      {"white missing queen, black to move",
       "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 1", 895},

      // Kings only, on mirrored squares. Both read -30 from the endgame table
      // and cancel, so what this pins down is that an almost-empty board does
      // not accumulate anything from its empty squares.
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
      // Then the tables. Both sides have a queen and rooks: middlegame kings.
      //
      //   White  pawns a2 5, b2 10, f2 10, g2 10, h2 5, d4 20      60
      //          Nc3 10, Be3 10, Ra1 0, Rf1 0, Qd1 -5, Kg1 30      45
      //                                                           105
      //   Black  pawns a7 5, b7 10, c7 10, f7 10, h7 5, e6 0, d5 20  60
      //          Nc6 10, Bc8 -10, Bg7 5, Ra8 0, Qd8 -5, Kg8 30     30
      //                                                            90
      //
      //   material +70, tables 105 - 90 = +15, total +85
      //
      // White is up the exchange, Black is up a pawn and holds the bishop
      // pair. The three material terms have different signs, so a swapped rook
      // and bishop value or a dropped minus sign moves the total.
      {"middlegame, white up the exchange, white to move",
       "r1bq2k1/ppp2pbp/2n1p3/3p4/3P4/2N1B3/PP3PPP/R2Q1RK1 w - - 0 12", 85},
      {"middlegame, white up the exchange, black to move",
       "r1bq2k1/ppp2pbp/2n1p3/3p4/3P4/2N1B3/PP3PPP/R2Q1RK1 b - - 0 12", -85},

      // The black mirror. A lone pawn on e2 for White, and the same pawn on e7
      // for Black with Black to move: the same position seen from the other
      // side, so the same score. 100 material, -20 on e2. The kings sit on
      // mirrored squares and cancel.
      //
      // Without the mirror the black pawn would read the rank 7 row, worth
      // +50, and score 150. So this is the case that fails if the flip is lost.
      {"lone white pawn on e2", "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1", 80},
      {"lone black pawn on e7, mirrored", "4k3/4p3/8/8/8/8/8/4K3 b - - 0 1", 80},
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

  // The positional claims the tables exist to make. Each is a pair of
  // positions identical except for one piece's square, so the only thing that
  // can separate the two scores is that piece's table entry. The exact values
  // are checked first and the comparison second: the comparison is the claim,
  // and the exact values stop it from passing for the wrong reason.
  {
    // No queens, so endgame kings, on e1 and e8, which cancel. The knight
    // alone decides: d4 is +20, a4 is -30.
    const int central = evaluate(parseFen("4k3/8/8/8/3N4/8/8/4K3 w - - 0 1"));
    const int edge = evaluate(parseFen("4k3/8/8/8/N7/8/8/4K3 w - - 0 1"));

    checkEqual(central, 340, "knight on d4 scores 320 + 20");
    checkEqual(edge, 290, "knight on a4 scores 320 - 30");
    check(central > edge, "central knight scores higher than edge knight");
  }

  {
    // Queens and rooks on both sides: middlegame kings. Black is the mirror of
    // the uncastled White setup and cancels it exactly, so the uncastled
    // position is 0 and the castled one is the g1 entry, +30. The rook stays
    // on f1 in both, so it is not a second difference.
    const int castled = evaluate(parseFen("r2qkr2/pppppppp/8/8/8/8/PPPPPPPP/R2Q1RK1 w - - 0 1"));
    const int uncastled = evaluate(parseFen("r2qkr2/pppppppp/8/8/8/8/PPPPPPPP/R2QKR2 w - - 0 1"));

    checkEqual(castled, 30, "middlegame king on g1 scores +30");
    checkEqual(uncastled, 0, "middlegame king on e1 scores 0");
    check(castled > uncastled, "castled king scores higher than uncastled king in the middlegame");
  }

  {
    // Bare kings: endgame table. e4 is +40, e1 is -30, and the black king on
    // e8 reads e1 through the mirror, -30. So 40 + 30 against -30 + 30.
    const int active = evaluate(parseFen("4k3/8/8/8/4K3/8/8/8 w - - 0 1"));
    const int passive = evaluate(parseFen("4k3/8/8/8/8/8/8/4K3 w - - 0 1"));

    checkEqual(active, 70, "bare endgame king on e4 scores +70");
    checkEqual(passive, 0, "bare endgame king on e1 scores 0");
    check(active > passive, "active central king scores higher than back-rank king in a bare endgame");
  }

  {
    // The same pair with a white queen added on d1 (900 - 5). This is the
    // phase rule's test. A side with a queen and nothing else still counts as
    // light, so the kings stay on the endgame table and e4 still wins, by the
    // same 70. Under "endgame only when no queens are left", the kings would
    // read the middlegame table instead, where e4 is -40 and e1 is 0, and the
    // comparison would flip.
    const int active = evaluate(parseFen("4k3/8/8/8/4K3/8/8/3Q4 w - - 0 1"));
    const int passive = evaluate(parseFen("4k3/8/8/8/8/8/8/3QK3 w - - 0 1"));

    checkEqual(active, 965, "king and queen against king, king on e4, scores 895 + 40 + 30");
    checkEqual(passive, 895, "king and queen against king, king on e1, scores 895 - 30 + 30");
    check(active > passive, "a lone queen still counts as an endgame for the king table");
  }
}
