// The choices a player makes before a game starts, and what they mean to the
// rest of the app. Everything here is a fixed table: no derived difficulty, no
// adaptive depth. Phase 1 keeps the mapping visible and boring on purpose.

export type Side = "white" | "black";

export type Difficulty = "easy" | "medium" | "hard";

export type TimeControlId = "1+0" | "3+2" | "10+0";

export type TimeControl = {
  id: TimeControlId;
  label: string;
  baseSeconds: number;
  incrementSeconds: number;
};

export type GameSettings = {
  side: Side;
  difficulty: Difficulty;
  timeControl: TimeControlId;
};

export const SIDES: readonly Side[] = ["white", "black"];

// Search depth handed to the WASM engine.
//
// Hard is capped at 6 because that is where this engine stops answering in
// reasonable time. Measured worst case per move, in a middlegame with 47 legal
// moves: depth 5 is 159ms, depth 6 is 3.1s, depth 7 is over 45s and depth 8 is
// over 60s. Anything past 6 flags on its own clock before it replies, so the
// ceiling is a property of the engine's search, not a difficulty choice. Raise
// this only alongside move-ordering work in engine/src/search.cpp.
export const DIFFICULTY_DEPTHS: Record<Difficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 6,
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export const TIME_CONTROLS: Record<TimeControlId, TimeControl> = {
  "1+0": { id: "1+0", label: "1+0", baseSeconds: 60, incrementSeconds: 0 },
  "3+2": { id: "3+2", label: "3+2", baseSeconds: 180, incrementSeconds: 2 },
  "10+0": { id: "10+0", label: "10+0", baseSeconds: 600, incrementSeconds: 0 },
};

export const TIME_CONTROL_IDS: readonly TimeControlId[] = ["1+0", "3+2", "10+0"];

export const DEFAULT_SETTINGS: GameSettings = {
  side: "white",
  difficulty: "medium",
  timeControl: "10+0",
};

export function depthFor(difficulty: Difficulty): number {
  return DIFFICULTY_DEPTHS[difficulty];
}

export function opposite(side: Side): Side {
  return side === "white" ? "black" : "white";
}

// chess.js speaks 'w' / 'b'. Converting at this boundary keeps the single-letter
// colours out of the UI layer entirely.
export function toChessColor(side: Side): "w" | "b" {
  return side === "white" ? "w" : "b";
}

export function fromChessColor(color: "w" | "b"): Side {
  return color === "w" ? "white" : "black";
}
