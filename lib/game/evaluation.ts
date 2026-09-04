// A material count, nothing more.
//
// This is a rough proxy so the eval bar has something to show while a game is
// in progress. It knows nothing about king safety, structure, activity, or
// tactics, so it will happily read 0.0 in a position that is completely
// winning. Calling the engine for a real evaluation on every ply would cost a
// full search per move purely for a cosmetic strip of the UI, which is not a
// trade worth making during play. Real evaluation arrives with post-game
// analysis in Phase 4.

import type { Chess } from "chess.js";

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Beyond this the bar is pinned; a nine-pawn material lead already reads as
// completely winning and there is no useful resolution past it.
const CLAMP_PAWNS = 10;

// Material balance in pawns, positive when White is ahead.
export function materialBalance(chess: Chess): number {
  let balance = 0;

  for (const row of chess.board()) {
    for (const square of row) {
      if (square === null) continue;
      const value = PIECE_VALUES[square.type] ?? 0;
      balance += square.color === "w" ? value : -value;
    }
  }

  return balance;
}

// Share of the bar belonging to White, 0 to 1. A level position sits at 0.5.
export function whiteShare(balance: number): number {
  const clamped = Math.max(-CLAMP_PAWNS, Math.min(CLAMP_PAWNS, balance));
  return (clamped + CLAMP_PAWNS) / (CLAMP_PAWNS * 2);
}

// The signed text beside the bar, e.g. "+1.0" or "0.0".
export function formatBalance(balance: number): string {
  if (balance === 0) return "0.0";
  const sign = balance > 0 ? "+" : "-";
  return `${sign}${Math.abs(balance).toFixed(1)}`;
}
