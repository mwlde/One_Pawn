#include <string>

#include "board.h"
#include "game.h"
#include "search.h"
#include "test_harness.h"

// Game loop tests.
//
// The loop itself is not tested, deliberately. Driving it would mean feeding it
// a fake stdin and matching printed output, which tests the wording of the
// prompts as much as the behaviour and breaks whenever the wording changes. It
// would also call findBestMove, which is far too slow to belong in a suite that
// runs on every build.
//
// So the loop was written to keep its two decisions in free functions instead:
// working out what the user typed, and turning a number into words. Those are
// pure, fast and worth pinning down. What is left in the loop is sequencing,
// and sequencing is what the interactive session verified.

namespace {

const char* const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Shorthand: did this text parse as a legal move, and if so which one.
std::string parsedAs(const std::string& text, const Board& board) {
  const std::optional<Move> move = parseMove(text, board);
  return move ? moveToString(*move, board) : std::string("none");
}

}  // namespace

void runGameTests() {
  section("game input");

  {
    checkEqual(trimInput("  e2e4  "), std::string("e2e4"), "trim strips spaces");
    checkEqual(trimInput("\t e2e4 \r\n"), std::string("e2e4"), "trim strips tabs and newlines");
    checkEqual(trimInput("e2e4"), std::string("e2e4"), "trim leaves clean input alone");
    checkEqual(trimInput("   "), std::string(""), "all whitespace trims to empty");
    checkEqual(trimInput(""), std::string(""), "empty stays empty");

    // Case is preserved, so an error message can quote back what was typed.
    checkEqual(trimInput(" Nf3 "), std::string("Nf3"), "trim preserves case");
  }

  {
    check(classifyInput("") == InputKind::Empty, "empty input is Empty");
    check(classifyInput("quit") == InputKind::Quit, "quit is Quit");
    check(classifyInput("exit") == InputKind::Quit, "exit is Quit");
    check(classifyInput("q") == InputKind::Quit, "q is Quit");
    check(classifyInput("resign") == InputKind::Resign, "resign is Resign");
    check(classifyInput("moves") == InputKind::ListMoves, "moves is ListMoves");
    check(classifyInput("list") == InputKind::ListMoves, "list is ListMoves");
    check(classifyInput("board") == InputKind::ShowBoard, "board is ShowBoard");
    check(classifyInput("undo") == InputKind::Undo, "undo is Undo");

    check(classifyInput("QUIT") == InputKind::Quit, "commands are case-insensitive");
    check(classifyInput("Undo") == InputKind::Undo, "mixed case commands work");

    // The fallback. Anything unrecognised is assumed to be an attempted move,
    // including a near-miss on a command, which is why "quitt" lands here and
    // gets rejected as an illegal move rather than silently quitting.
    check(classifyInput("e2e4") == InputKind::MoveText, "a move is MoveText");
    check(classifyInput("quitt") == InputKind::MoveText, "a mistyped command is MoveText");
    check(classifyInput("xyzzy") == InputKind::MoveText, "garbage is MoveText");
  }

  {
    const Board board = parseFen(START_FEN);

    checkEqual(parsedAs("e2e4", board), std::string("e2e4"), "a legal move parses");
    checkEqual(parsedAs("g1f3", board), std::string("g1f3"), "a knight move parses");
    checkEqual(parsedAs("E2E4", board), std::string("e2e4"), "move input is case-insensitive");

    // SAN is rejected rather than translated. Long algebraic is what the engine
    // prints and what UCI speaks, and accepting both would mean writing a SAN
    // parser, which has to resolve ambiguity against the position.
    checkEqual(parsedAs("Nf3", board), std::string("none"), "SAN is rejected");
    checkEqual(parsedAs("e4", board), std::string("none"), "short algebraic is rejected");

    // Illegal, impossible and misspelt all land in the same place.
    checkEqual(parsedAs("e2e5", board), std::string("none"), "an illegal move is rejected");
    checkEqual(parsedAs("e9e9", board), std::string("none"), "an off-board square is rejected");
    checkEqual(parsedAs("", board), std::string("none"), "empty text is rejected");
    checkEqual(parsedAs("e2e4extra", board), std::string("none"), "trailing junk is rejected");
  }

  {
    // The three irregular moves, since their notation is the part a user is
    // most likely to get wrong and the part most likely to break.
    const Board promotion = parseFen("8/P7/8/8/8/8/8/K6k w - - 0 1");
    checkEqual(parsedAs("a7a8q", promotion), std::string("a7a8q"), "promotion parses");
    checkEqual(parsedAs("a7a8", promotion), std::string("none"),
               "promotion without a piece letter is rejected");

    // Castling is typed as the king's own move, not O-O.
    const Board castling = parseFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    checkEqual(parsedAs("e1g1", castling), std::string("e1g1"), "kingside castling parses");
    checkEqual(parsedAs("e1c1", castling), std::string("e1c1"), "queenside castling parses");
    checkEqual(parsedAs("O-O", castling), std::string("none"), "O-O notation is rejected");

    const Board enPassant = parseFen("8/8/8/3pP3/8/8/8/K6k w - d6 0 1");
    checkEqual(parsedAs("e5d6", enPassant), std::string("e5d6"), "en passant parses");
  }

  section("game score formatting");

  {
    // Always signed, because "25" alone does not say for whom.
    checkEqual(formatScore(25), std::string("+25"), "a positive score gains a plus");
    checkEqual(formatScore(-310), std::string("-310"), "a negative score keeps its minus");
    checkEqual(formatScore(0), std::string("0"), "zero is unsigned");

    // Plies to mate, converted to moves. The mating side makes the last one, so
    // one ply and two plies are both "mate in 1".
    checkEqual(formatScore(MATE_SCORE - 1), std::string("mate in 1"), "one ply is mate in 1");
    checkEqual(formatScore(MATE_SCORE - 2), std::string("mate in 1"), "two plies is mate in 1");
    checkEqual(formatScore(MATE_SCORE - 3), std::string("mate in 2"), "three plies is mate in 2");
    checkEqual(formatScore(-(MATE_SCORE - 3)), std::string("mated in 2"), "losing mates invert");

    // Zero plies means it has already happened.
    checkEqual(formatScore(-MATE_SCORE), std::string("checkmate"), "mated at the root");

    // Just below the threshold is material, not mate. This is the boundary that
    // would break if MATE_THRESHOLD and the encoding ever disagreed.
    checkEqual(formatScore(MATE_THRESHOLD - 1), std::string("+" + std::to_string(MATE_THRESHOLD - 1)),
               "just below the threshold is still centipawns");
  }
}
