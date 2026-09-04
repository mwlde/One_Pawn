#include "game.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <string>
#include <vector>

#include "movegen.h"
#include "position.h"
#include "search.h"

namespace {

// One played half-move and what it takes to reverse it. The pair is never
// separated, because unmakeMove needs both and a mismatched pair corrupts the
// board silently.
struct HistoryEntry {
  Move move;
  UndoRecord undo;
};

// How a user's turn finished. A bool would do today, but "the game is over"
// has three distinct causes worth naming at the call site, and the loop below
// prints nothing for any of them: each case has already said its piece.
//
// Undo is absent deliberately. Taking moves back leaves it still the user's
// turn, so it loops back to the prompt inside takeUserTurn and playGame never
// needs to hear about it.
enum class TurnResult { MoveMade, Quit, Resigned, EndOfInput };

std::string toLower(const std::string& text) {
  std::string lowered = text;
  // The cast is not decoration. std::tolower takes an int that must be
  // representable as unsigned char, and a plain char is signed on most
  // platforms, so a byte above 127 arrives negative and the call is undefined.
  std::transform(lowered.begin(), lowered.end(), lowered.begin(),
                 [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  return lowered;
}

// Thousands separators, by hand.
//
// The standard way is to imbue the stream with a locale, which is global state,
// depends on which locales the host actually has installed, and would change
// the formatting of every other number this program prints. Ten lines is the
// cheaper answer.
std::string groupDigits(uint64_t value) {
  const std::string digits = std::to_string(value);
  std::string grouped;
  for (size_t i = 0; i < digits.size(); ++i) {
    // Separators fall before every third digit counting from the right, which
    // is the same as "the remaining digit count is a multiple of three".
    if (i > 0 && (digits.size() - i) % 3 == 0) grouped += ',';
    grouped += digits[i];
  }
  return grouped;
}

const char* sideName(Color color) { return color == Color::White ? "White" : "Black"; }

void printLegalMoves(const Board& board) {
  const std::vector<Move> moves = generateLegalMoves(board);
  std::cout << moves.size() << " legal moves:";
  for (size_t i = 0; i < moves.size(); ++i) {
    // Eight per line, so a middlegame position does not scroll the board away.
    std::cout << (i % 8 == 0 ? "\n  " : "  ") << moveToString(moves[i], board);
  }
  std::cout << '\n';
}

void printHelp() {
  std::cout << "Commands: a move in long algebraic notation (e2e4, g1f3, e7e8q, e1g1),\n";
  std::cout << "          moves, board, undo, resign, quit\n";
}

// Announces the result if the game has ended, and says whether it had.
//
// An empty move list is the only end condition this stage knows about. The
// fifty-move rule and threefold repetition are deferred, so a dead-drawn
// position here will simply be played on until one side is mated or stalemated.
bool announceIfOver(const Board& board) {
  if (!generateLegalMoves(board).empty()) return false;

  if (isInCheck(board)) {
    // The side to move is the side that has been mated, so the winner is the
    // other one.
    std::cout << "\n" << sideName(opposite(board.sideToMove)) << " wins by checkmate\n";
  } else {
    std::cout << "\nDraw by stalemate\n";
  }
  return true;
}

// Takes back the user's move and the engine's reply, newest first.
//
// Newest first is not a preference, it is the only order that works. unmakeMove
// restores the position makeMove was given, so the records have to come off the
// stack in the reverse of the order they went on.
void undoLastTwo(Board& board, std::vector<HistoryEntry>& history) {
  for (int i = 0; i < 2; ++i) {
    const HistoryEntry entry = history.back();
    unmakeMove(board, entry.move, entry.undo);
    history.pop_back();
  }
}

// Prompts until the user does something that ends their turn. Commands that
// only print something loop back to the prompt.
TurnResult takeUserTurn(Board& board, std::vector<HistoryEntry>& history) {
  while (true) {
    std::cout << "\nMove " << board.fullmoveNumber << " (" << sideName(board.sideToMove)
              << ") > " << std::flush;

    std::string line;
    if (!std::getline(std::cin, line)) {
      // Ctrl-D, or stdin was a file that ran out. Not an error: a scripted
      // session ending is a normal way for this program to finish.
      std::cout << "\nEnd of input\n";
      return TurnResult::EndOfInput;
    }

    const std::string input = trimInput(line);

    switch (classifyInput(input)) {
      case InputKind::Empty:
        continue;

      case InputKind::Quit:
        std::cout << "Game ended by user\n";
        return TurnResult::Quit;

      case InputKind::Resign:
        std::cout << "You resigned\n";
        return TurnResult::Resigned;

      case InputKind::ListMoves:
        printLegalMoves(board);
        continue;

      case InputKind::ShowBoard:
        printBoard(board);
        continue;

      case InputKind::Undo:
        // Two half-moves, so the board returns to the position the user faced
        // before their last move rather than to the engine's turn.
        if (history.size() < 2) {
          std::cout << "Nothing to undo: fewer than two half-moves have been played\n";
          continue;
        }
        undoLastTwo(board, history);
        std::cout << "Took back your move and the engine's reply.\n";
        printBoard(board);
        continue;

      case InputKind::MoveText: {
        const std::optional<Move> move = parseMove(input, board);
        if (!move) {
          // Deliberately without the legal move list. A wall of moves after
          // every typo buries the message, and `moves` is there for anyone who
          // wants it.
          std::cout << "Illegal move: " << input << "\n";
          continue;
        }
        const UndoRecord undo = makeMove(board, *move);
        history.push_back({*move, undo});
        printBoard(board);
        return TurnResult::MoveMade;
      }
    }
  }
}

void takeEngineTurn(Board& board, std::vector<HistoryEntry>& history, int depth) {
  const auto start = std::chrono::steady_clock::now();
  const Move best = findBestMove(board, depth);
  const std::chrono::duration<double, std::milli> elapsed =
      std::chrono::steady_clock::now() - start;

  // playGame checks for game over before every turn, so by the time control
  // reaches here there is at least one legal move and the search cannot have
  // returned a null one.

  // Written before the move is played: moveToString documents its board
  // argument as the position the move applies to, and although long algebraic
  // does not consult it today, SAN will.
  std::cout << "\nMove " << board.fullmoveNumber << " (" << sideName(board.sideToMove)
            << ") Engine plays " << moveToString(best, board)
            << " (score: " << formatScore(lastSearchScore())
            << ", nodes: " << groupDigits(lastSearchNodes())
            << ", time: " << static_cast<long long>(elapsed.count() + 0.5) << " ms)\n";

  const UndoRecord undo = makeMove(board, best);
  history.push_back({best, undo});
  printBoard(board);
}

}  // namespace

std::string trimInput(const std::string& line) {
  const auto isSpace = [](unsigned char c) { return std::isspace(c) != 0; };

  auto first = line.begin();
  while (first != line.end() && isSpace(static_cast<unsigned char>(*first))) ++first;

  auto last = line.end();
  while (last != first && isSpace(static_cast<unsigned char>(*(last - 1)))) --last;

  return std::string(first, last);
}

InputKind classifyInput(const std::string& input) {
  if (input.empty()) return InputKind::Empty;

  const std::string command = toLower(input);
  if (command == "quit" || command == "exit" || command == "q") return InputKind::Quit;
  if (command == "resign") return InputKind::Resign;
  if (command == "moves" || command == "list") return InputKind::ListMoves;
  if (command == "board") return InputKind::ShowBoard;
  if (command == "undo") return InputKind::Undo;

  return InputKind::MoveText;
}

std::optional<Move> parseMove(const std::string& text, const Board& board) {
  const std::string wanted = toLower(text);
  for (const Move& move : generateLegalMoves(board)) {
    if (moveToString(move, board) == wanted) return move;
  }
  return std::nullopt;
}

std::string formatScore(int score) {
  const int magnitude = (score < 0) ? -score : score;

  if (magnitude < MATE_THRESHOLD) {
    // to_string already supplies the minus sign; only the plus needs adding.
    return (score > 0 ? "+" : "") + std::to_string(score);
  }

  const int plies = MATE_SCORE - magnitude;
  if (plies == 0) return score > 0 ? "opponent is mated" : "checkmate";

  // Chess counts mates in moves, and the mating side makes the last one, so two
  // plies is still "mate in 1" and the division rounds up.
  return (score > 0 ? "mate in " : "mated in ") + std::to_string((plies + 1) / 2);
}

int playGame(Board board, const GameOptions& options) {
  std::vector<HistoryEntry> history;

  std::cout << "You play " << sideName(options.userColor) << ", the engine plays "
            << sideName(opposite(options.userColor)) << " at depth " << options.depth << ".\n";
  printHelp();
  printBoard(board);

  while (true) {
    // Checked before every turn rather than after every move, so a game that
    // is already over when the program starts is reported rather than played.
    if (announceIfOver(board)) return 0;

    if (board.sideToMove == options.userColor) {
      if (takeUserTurn(board, history) != TurnResult::MoveMade) return 0;
    } else {
      takeEngineTurn(board, history, options.depth);
    }
  }
}
