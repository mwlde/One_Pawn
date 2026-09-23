// The choices a player makes before a game starts, and what they mean to the
// rest of the app. Everything here is a fixed table: no derived difficulty, no
// adaptive depth. Phase 1 keeps the mapping visible and boring on purpose.

import { DEFAULT_MODE, type GameMode } from "./mode";

export type Side = "white" | "black";

export type Difficulty = "easy" | "medium" | "hard";

// The id keeps the "base+increment" shorthand, because that is what the game is
// and what the saved row records. The label is the human-facing name shown on
// the button and in history: minutes, not shorthand, because a family tester
// does not read "3+2". The category names the family (Blitz, Rapid, Classical)
// for the one-line description under the picker.
export type TimeControlId = "3+2" | "5+0" | "10+0" | "15+10" | "30+0";

export type TimeControlCategory = "Blitz" | "Rapid" | "Classical";

export type TimeControl = {
  id: TimeControlId;
  label: string;
  category: TimeControlCategory;
  baseSeconds: number;
  incrementSeconds: number;
};

export type GameSettings = {
  side: Side;
  difficulty: Difficulty;
  timeControl: TimeControlId;
  mode: GameMode;
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
  "3+2": { id: "3+2", label: "3 min", category: "Blitz", baseSeconds: 180, incrementSeconds: 2 },
  "5+0": { id: "5+0", label: "5 min", category: "Blitz", baseSeconds: 300, incrementSeconds: 0 },
  "10+0": { id: "10+0", label: "10 min", category: "Rapid", baseSeconds: 600, incrementSeconds: 0 },
  "15+10": { id: "15+10", label: "15 min", category: "Rapid", baseSeconds: 900, incrementSeconds: 10 },
  "30+0": { id: "30+0", label: "30 min", category: "Classical", baseSeconds: 1800, incrementSeconds: 0 },
};

export const TIME_CONTROL_IDS: readonly TimeControlId[] = ["3+2", "5+0", "10+0", "15+10", "30+0"];

export const DEFAULT_SETTINGS: GameSettings = {
  side: "white",
  difficulty: "medium",
  timeControl: "10+0",
  // The setup screen overrides this from the remembered preference on mount;
  // this is the value the first server render and a storage-less browser use.
  mode: DEFAULT_MODE,
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
