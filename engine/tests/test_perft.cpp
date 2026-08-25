#include <cstdint>
#include <string>
#include <vector>

#include "board.h"
#include "perft.h"
#include "test_harness.h"

// Perft against the six standard positions from the chess programming wiki.
//
// These numbers are not ours. Dozens of engines agree on them to the last
// digit, which makes this the one test in the engine that cannot pass for the
// wrong reason. Everything else here was written by the same person who wrote
// the code it tests.
//
// Depths are capped so the suite stays under a couple of seconds. The published
// values run much deeper, and the CLI is there for that: `onepawn-engine perft
// 6` when there is time to wait. Depth 4 is already past every edge case these
// positions were chosen for.

namespace {

struct PerftCase {
  const char* name;
  const char* fen;
  std::vector<uint64_t> expected;  // index 0 is depth 1
};

const std::vector<PerftCase>& perftCases() {
  static const std::vector<PerftCase> cases = {
      {"1 starting position",
       "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
       {20, 400, 8902, 197281}},
      {"2 kiwipete",
       "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
       {48, 2039, 97862, 4085603}},
      {"3 en passant",
       "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
       {14, 191, 2812, 43238, 674624}},
      {"4 promotions",
       "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
       {6, 264, 9467, 422333}},
      {"5 castling",
       "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
       {44, 1486, 62379, 2103487}},
      {"6 stress test",
       "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
       {46, 2079, 89890, 3894594}},
  };
  return cases;
}

}  // namespace

void runPerftTests() {
  section("perft");

  for (const PerftCase& testCase : perftCases()) {
    for (size_t index = 0; index < testCase.expected.size(); ++index) {
      const int depth = static_cast<int>(index) + 1;

      // A fresh board per depth. perft restores what it is given, so reusing
      // one would work, but a test that depends on that is testing perft with
      // perft.
      Board board = parseFen(testCase.fen);
      const uint64_t nodes = perft(board, depth);

      checkEqual(nodes, testCase.expected[index],
                 std::string(testCase.name) + ", depth " + std::to_string(depth));
    }
  }
}
