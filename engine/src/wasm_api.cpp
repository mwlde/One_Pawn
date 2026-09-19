// C-style API exposed to JavaScript once the engine is compiled to WebAssembly.
//
// This is the only file in engine/src/ that JavaScript calls into. Nothing on
// the C++ side calls these functions either: they are declared extern "C" so
// nothing needs to see their signatures, and there is no header, because a
// header would only exist to be included by callers that do not exist.
//
// Exporting: rather than mark each function EMSCRIPTEN_KEEPALIVE here, the
// names are listed individually in build.sh's EXPORTED_FUNCTIONS. That
// list already has to name them (it is how JS gets a Module._engineGetBestMove
// to call), and EXPORTED_FUNCTIONS also roots them against dead-code
// elimination the same way the attribute would. Marking them here too would
// just be the same fact recorded in two places, so this file has no
// Emscripten-specific include or attribute at all: it is otherwise ordinary
// C++ compiled into the WASM build.
//
// Returned strings: engineGetBestMove and engineGetError each return a
// pointer into a static std::string owned by this file (g_moveBuffer and
// g_errorBuffer below). Every call overwrites its own buffer. This is safe
// only because JavaScript reads the string immediately after the call
// returns (typically via UTF8ToString) and never holds the pointer across a
// second call into this API. There is no locking anywhere here; nothing in a
// single-threaded WASM build needs it.
//
// Exceptions: chess.js-level bugs aside, the one call in this file that can
// throw is parseFen, and only for malformed input. Every exception is caught
// here and turned into a failure the JS side can read back with engineGetError:
// a NULL return from the string-returning calls, a 0 return from the
// score-returning one. Either way engineHasError() is what tells a real result
// from a failed one, since 0 is also a legitimate score (a stalemate) and ""
// a legitimate move buffer. No C++ exception is allowed to reach the WASM/JS
// boundary; letting one propagate out of an extern "C" function is undefined
// behaviour under Emscripten's default (JS-based) exception handling.

#include <exception>
#include <stdexcept>
#include <string>

#include "board.h"
#include "move.h"
#include "search.h"

namespace {

std::string g_moveBuffer;
std::string g_errorBuffer;
bool g_hasError = false;

void setError(const std::string& message) {
  g_errorBuffer = message;
  g_hasError = true;
}

}  // namespace

extern "C" {

const char* engineGetBestMove(const char* fen, int depth) {
  // Every call starts clean, so an error from a previous call never leaks
  // into a result that this call did not actually produce.
  g_hasError = false;

  // std::string's constructor from a null const char* is undefined behaviour,
  // not a thrown exception, so the try/catch below cannot turn a null fen
  // into a clean error. Checked separately, before it can do any damage.
  if (fen == nullptr) {
    setError("fen is null");
    return nullptr;
  }

  try {
    Board board = parseFen(fen);
    const Move best = findBestMove(board, depth);

    if (isNullMove(best)) {
      // Not malformed input, just nothing to play. isNullMove is also what
      // depth <= 0 and a finished game (checkmate/stalemate) both return, so
      // they are told apart the same way runSearch in main.cpp tells them
      // apart: by depth, then by the score the search settled on.
      if (depth <= 0) {
        setError("depth must be at least 1");
      } else if (lastSearchScore() == 0) {
        setError("no legal moves: stalemate");
      } else {
        setError("no legal moves: checkmate");
      }
      return nullptr;
    }

    g_moveBuffer = moveToString(best, board);
    return g_moveBuffer.c_str();
  } catch (const std::invalid_argument& error) {
    // parseFen's failure mode: a malformed FEN string.
    setError(error.what());
    return nullptr;
  } catch (const std::exception& error) {
    setError(error.what());
    return nullptr;
  } catch (...) {
    setError("unknown error");
    return nullptr;
  }
}

int engineEvaluatePosition(const char* fen, int depth) {
  // Same clean-slate and null-fen contract as engineGetBestMove: a stale error
  // must not survive into this call, and std::string from a null pointer is
  // undefined behaviour rather than a catchable throw.
  g_hasError = false;

  if (fen == nullptr) {
    setError("fen is null");
    return 0;
  }

  try {
    Board board = parseFen(fen);

    // The score, not the move. findBestMove already settles every case this
    // needs: it runs the same negamax, and it writes lastSearchScore() to the
    // negamax value for a normal position, to evaluate(board) at depth <= 0,
    // and to the terminal verdict when there are no legal moves (-MATE_SCORE
    // for checkmate, 0 for stalemate, both from the side-to-move perspective).
    // Re-deriving any of that here would just be a second copy of logic the
    // search already owns.
    findBestMove(board, depth);
    return lastSearchScore();
  } catch (const std::invalid_argument& error) {
    setError(error.what());
    return 0;
  } catch (const std::exception& error) {
    setError(error.what());
    return 0;
  } catch (...) {
    setError("unknown error");
    return 0;
  }
}

const char* engineGetError() {
  // Once read, an error is consumed: a second call with nothing new pending
  // returns "" rather than repeating the last message, which is what makes
  // hasError() and getError() agree with each other after either one runs.
  if (!g_hasError) return "";
  g_hasError = false;
  return g_errorBuffer.c_str();
}

int engineHasError() { return g_hasError ? 1 : 0; }

}  // extern "C"
