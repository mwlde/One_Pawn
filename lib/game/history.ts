// What the profile screens need from a saved game: the words on a row, the
// numbers in the stats header, and the shapes both are read from. Pure, so it
// can be tested without a database and formatted on the server, which is where
// this runs: a relative date computed in the browser would disagree with the
// one the server rendered a moment earlier.

import type { GameResult } from "./save";
import { DIFFICULTY_DEPTHS, DIFFICULTY_LABELS, type Difficulty, type Side, type TimeControlId } from "./settings";

// A row of the games table, minus the PGN. The list never reads the moves, and
// fifty PGNs is a payload worth not sending to a page that only counts them.
export type GameSummary = {
  id: string;
  result: GameResult;
  user_color: Side;
  difficulty: number;
  time_control: TimeControlId;
  move_count: number;
  played_at: string;
};

// The whole row. Only the replay screen needs it.
export type SavedGame = GameSummary & { pgn: string };

// Column lists rather than select("*"), so a column added later does not start
// arriving on a screen that never asked for it.
export const GAME_SUMMARY_COLUMNS =
  "id, result, user_color, difficulty, time_control, move_count, played_at";
export const SAVED_GAME_COLUMNS = `${GAME_SUMMARY_COLUMNS}, pgn`;

export type ResultLabel = "You won" | "You lost" | "Draw" | "You resigned";

// The result column is absolute ("who won"), the badge is relative ("what
// happened to me"), so the user's colour has to come in alongside it.
//
// abandoned is read as a resignation because resignation is the only thing that
// writes it: see resultFor in save.ts. If a later phase stores abandonment for
// another reason, this label stops being true and needs splitting.
export function resultLabel(result: GameResult, userColor: Side): ResultLabel {
  if (result === "abandoned") return "You resigned";
  if (result === "draw") return "Draw";
  const winner: Side = result === "white_wins" ? "white" : "black";
  return winner === userColor ? "You won" : "You lost";
}

export type GameStats = {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  resigned: number;
  // Percent, or null when there is nothing to divide by. Kept as a number so
  // the "--" case is the caller's decision rather than a string to parse back.
  winRate: number | null;
};

// Counted through resultLabel rather than off the result column directly, so
// the stats and the badges can never disagree about what a row was.
export function computeStats(games: readonly GameSummary[]): GameStats {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let resigned = 0;

  for (const game of games) {
    switch (resultLabel(game.result, game.user_color)) {
      case "You won":
        wins += 1;
        break;
      case "You lost":
        losses += 1;
        break;
      case "Draw":
        draws += 1;
        break;
      case "You resigned":
        resigned += 1;
        break;
    }
  }

  // Draws come out of the denominator, resignations do not: a resignation is a
  // game that was lost, just not on the board.
  const decisive = games.length - draws;

  return {
    played: games.length,
    wins,
    losses,
    draws,
    resigned,
    winRate: decisive > 0 ? Math.round((wins / decisive) * 100) : null,
  };
}

export function formatWinRate(winRate: number | null): string {
  return winRate === null ? "--" : `${winRate}%`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// Written out rather than taken from toLocaleDateString. The short month name
// for September moved from "Sep" to "Sept" in recent CLDR data, so the locale
// formatter gives a different answer depending on which ICU the runtime was
// built with. A fixed table is one line longer and always says the same thing.
const MONTHS: readonly string[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function ago(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

// Relative inside a week, absolute beyond it. `now` is a parameter so the
// boundaries can be tested without waiting for them.
export function formatPlayedAt(playedAt: string, now: Date = new Date()): string {
  const date = new Date(playedAt);
  if (Number.isNaN(date.getTime())) return "unknown date";

  const elapsed = now.getTime() - date.getTime();

  // A negative elapsed time means the row is stamped in the future, which is
  // clock skew between the database and this machine rather than a real date.
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return ago(Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return ago(Math.floor(elapsed / HOUR), "hour");
  if (elapsed < WEEK) return ago(Math.floor(elapsed / DAY), "day");

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// move_count is stored in plies. Chess players count full moves, so every
// screen that shows it divides. See buildSavePayload in save.ts.
export function formatMoveCount(plies: number): string {
  const moves = Math.ceil(plies / 2);
  return `${moves} ${moves === 1 ? "move" : "moves"}`;
}

export function describeOpponent(depth: number): string {
  return `Engine at depth ${depth}`;
}

// The games table stores the search depth, not the difficulty that chose it, so
// the label has to be looked back up. An unrecognised depth is possible: the
// depths are allowed to change, and old rows keep whatever they were saved with.
export function describeDifficulty(depth: number): string {
  const entry = (Object.keys(DIFFICULTY_DEPTHS) as Difficulty[]).find(
    (difficulty) => DIFFICULTY_DEPTHS[difficulty] === depth,
  );
  return entry === undefined ? `Depth ${depth}` : `${DIFFICULTY_LABELS[entry]} · depth ${depth}`;
}
