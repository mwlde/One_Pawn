// What a finished game looks like on its way to Supabase, and everything
// involved in putting it there. Kept out of the play screen so the derivation
// can be tested without a board, a session or a network, and so the component is
// left holding state rather than transport.

import type { Chess } from "chess.js";

import type { GameEnd } from "./result";
import { depthFor, type GameSettings, type Side, type TimeControlId } from "./settings";

// The four values the games table's check constraint accepts. Absolute, not
// relative to the user: GameEnd.outcome answers "did I win", this answers "who
// won", and only the second one is worth storing.
export type GameResult = "white_wins" | "black_wins" | "draw" | "abandoned";

// Keys are snake_case because they are column names, not identifiers of ours.
// The route inserts this object as-is, so a rename here is a schema change.
// user_id is deliberately absent: it comes from the session on the server, never
// from the client.
export type SaveGamePayload = {
  pgn: string;
  result: GameResult;
  user_color: Side;
  difficulty: number;
  time_control: TimeControlId;
  move_count: number;
};

export type SaveErrorKind =
  | "not_authenticated"
  | "email_not_verified"
  | "invalid_game_data"
  | "save_failed"
  | "network";

export type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; id: string }
  | { status: "error"; error: SaveErrorKind };

const ERROR_KINDS: readonly SaveErrorKind[] = [
  "not_authenticated",
  "email_not_verified",
  "invalid_game_data",
  "save_failed",
  "network",
];

// A resignation has a winner in the ordinary sense, but the table records it as
// abandoned rather than as a win, so the cause has to be read before the winner.
export function resultFor(end: GameEnd): GameResult {
  if (end.cause === "resignation") return "abandoned";
  if (end.winner === null) return "draw";
  return end.winner === "white" ? "white_wins" : "black_wins";
}

// Every field is read here, at the moment the game ends, and nothing in the
// payload points back at the live board. That is what lets a failed save be
// retried after a rematch has already started: the retry sends the game that
// finished, not whatever is on the board when the button is pressed.
export function buildSavePayload(
  chess: Chess,
  settings: GameSettings,
  end: GameEnd,
): SaveGamePayload {
  return {
    pgn: chess.pgn(),
    result: resultFor(end),
    user_color: settings.side,
    difficulty: depthFor(settings.difficulty),
    time_control: settings.timeControl,
    // Plies, not full moves, which is the usual split: engines and chess.js
    // count plies, chess UIs count full moves. The column stores the ply count
    // and anything displaying it divides, the way the post-game screen already
    // does. A four-ply game is stored as 4 and shown as "2 moves".
    move_count: chess.history().length,
  };
}

// The two readers below exist because a response body is unknown until it has
// been checked. Anything unrecognised becomes save_failed, which is the generic
// "try again" case rather than a message that claims to know what went wrong.
export function readSavedId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  if (!("id" in body)) return null;
  const id = (body as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}

export function readErrorKind(body: unknown): SaveErrorKind {
  if (typeof body !== "object" || body === null) return "save_failed";
  if (!("error" in body)) return "save_failed";
  const error = (body as { error: unknown }).error;
  if (typeof error !== "string") return "save_failed";
  return ERROR_KINDS.find((kind) => kind === error) ?? "save_failed";
}

// Returns the state the save ended in rather than reporting it, so the caller
// decides when that state is applied. The play screen needs that: one of its two
// callers is an effect, and an effect may only set state from a callback.
export async function saveGame(payload: SaveGamePayload): Promise<SaveState> {
  let response: Response;
  try {
    response = await fetch("/api/games/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Offline, DNS, a dropped connection: nothing was stored and nothing is
    // known about why, so it is worth distinguishing from a refusal.
    return { status: "error", error: "network" };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return { status: "error", error: readErrorKind(body) };
  }

  const id = readSavedId(body);
  return id === null ? { status: "error", error: "save_failed" } : { status: "saved", id };
}
