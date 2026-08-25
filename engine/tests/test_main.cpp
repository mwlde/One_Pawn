#include <iostream>
#include <stdexcept>

#include "test_harness.h"

namespace {

// Each runner is wrapped so that a throw stops that file and not the suite.
// The one thing that throws here is requireMove, and it throws when a test asks
// for a move the generator did not produce. That is a real failure and it
// should be reported as one rather than as a crash with no tally.
void run(void (*tests)(), const char* name) {
  try {
    tests();
  } catch (const std::exception& error) {
    ++checksRun;
    ++checksFailed;
    std::cout << "  FAIL  " << name << " stopped early: " << error.what() << "\n";
  }
}

}  // namespace

int main() {
  std::cout << "One Pawn engine tests\n";

  run(runMakeUnmakeTests, "make/unmake tests");
  run(runAttackTests, "attack tests");
  run(runPerftTests, "perft tests");

  return report();
}
