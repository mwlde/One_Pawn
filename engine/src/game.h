#pragma once

#include <optional>
#include <string>

#include "board.h"
#include "move.h"

// The command-line game loop: a person at a terminal against the engine.
//
// This is orchestration, not algorithm. Nothing here decides anything about
// chess. It reads a line, works out what the person meant, asks the search for
// a reply, and prints boards. Everything it knows about the rules it learns by
// asking generateLegalMoves.
//
// It lives apart from main.cpp because main.cpp is argument parsing and
// dispatch, and because the two interesting parts of a game loop, working out
// what the user typed and turning a score into words, are worth testing without
// a terminal attached. Those are the free functions below.
//
// **Colour.** The user plays White by default and the engine plays Black; the
// --black flag swaps that. This is the simpler of the two options in the brief.
// Inferring the user's colour from the FEN's side-to-move field reads well
// until you want the engine to move first from a given position, which is
// exactly what testing a mate-in-one requires, and then there is no way to ask
// for it. One flag covers both cases with no rule to remember.

// Search depth bounds for the play subcommand.
//
// The ceiling is not a technical limit. Without move ordering the search roughly
// multiplies its work by five or six per ply, so depth 10 from a middlegame
// position would run for hours, and a person waiting at a prompt with no way to
// interrupt it would reasonably conclude the program had hung. The floor is
// there because depth 0 returns no move at all.
constexpr int MIN_SEARCH_DEPTH = 1;
constexpr int MAX_SEARCH_DEPTH = 10;
constexpr int DEFAULT_SEARCH_DEPTH = 4;

// What a line typed at the prompt turned out to be.
//
// MoveText is the fallback, not a positive identification: anything that is not
// a recognised command is assumed to be an attempt at a move, and parseMove
// decides whether it was a good one. That ordering matters. The alternative,
// checking whether it parses as a move first, would silently treat a mistyped
// command as an illegal move.
enum class InputKind { Empty, Quit, Resign, ListMoves, ShowBoard, Undo, MoveText };

// Strips leading and trailing whitespace. Returns the text unchanged otherwise,
// including its case, so an error message can quote back what was actually
// typed rather than a normalised version of it.
std::string trimInput(const std::string& line);

// Classifies already-trimmed input. Case-insensitive: QUIT, Quit and quit are
// the same command.
InputKind classifyInput(const std::string& input);

// The legal move matching `text` in long algebraic notation, if there is one.
//
// Matching goes through generateLegalMoves rather than parsing the squares out
// of the string, which means the parser can only ever return a move the
// generator actually produced. Illegal, impossible and misspelt input all land
// in the same place with no special handling: no match.
//
// Case-insensitive, so E2E4 works. SAN is rejected by falling out of the same
// loop, since "nf3" is not the notation moveToString produces for anything.
//
// std::optional here, where board.h chose a sentinel for NO_SQUARE and search.h
// chose one for the null move. The difference is the setting rather than a
// change of mind: those two sit in inner loops where optional's ceremony is
// paid millions of times, this one runs once per keystroke, and "no such legal
// move" is a case the caller must not be able to forget to check.
std::optional<Move> parseMove(const std::string& text, const Board& board);

// A score in the compact form used at the board: "+25", "-310", "mate in 2".
//
// Signed always, because "25" alone does not say for whom. Mate scores are
// decoded from the distance encoding described in search.h.
std::string formatScore(int score);

// How the game is set up. Defaults are the ones the play subcommand uses when
// given no arguments.
struct GameOptions {
  int depth = DEFAULT_SEARCH_DEPTH;
  Color userColor = Color::White;
};

// Runs the game to its end and returns a process exit code.
//
// The board is taken by value. This function owns the position for the duration
// of the game and mutates it constantly, and unlike search it has no reason to
// hand it back, so copying once at the boundary is clearer than a reference the
// caller must not touch.
int playGame(Board board, const GameOptions& options);
