// Clock display and arithmetic. Times are held in milliseconds everywhere and
// only turned into text here.

import type { Side } from "./settings";

export type Clocks = Record<Side, number>;

// Rounds up so a clock reads 0:01 for the whole of its final second and only
// shows 0:00 once the side has genuinely flagged. Rounding down would display
// 0:00 for a full second while the game was still live.
export function formatClock(milliseconds: number): string {
  const safe = Math.max(0, milliseconds);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function initialClocks(baseSeconds: number): Clocks {
  return { white: baseSeconds * 1000, black: baseSeconds * 1000 };
}

export function applyIncrement(clocks: Clocks, side: Side, incrementSeconds: number): Clocks {
  return { ...clocks, [side]: clocks[side] + incrementSeconds * 1000 };
}

export function deduct(clocks: Clocks, side: Side, elapsedMilliseconds: number): Clocks {
  return { ...clocks, [side]: Math.max(0, clocks[side] - elapsedMilliseconds) };
}
