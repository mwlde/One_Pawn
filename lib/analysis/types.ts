// Shared shapes for game analysis. The classifier, the single-move primitive,
// the game workflow, the save route and the replay UI all read from here, so
// the tiers and the row shape are defined once.

// Search depth for post-game analysis. Higher than gameplay would catch
// subtler mistakes, but this engine has no move ordering, transposition table
// or quiescence search, so its cost climbs steeply: depth 7 already takes over
// 45 seconds on a single busy middlegame position (see DIFFICULTY_DEPTHS in
// lib/game/settings.ts). Depth 5 is the deepest that keeps a whole game's
// analysis under a minute. Raise it only alongside search-ordering work.
export const ANALYSIS_DEPTH = 5;

export const CLASSIFICATIONS = [
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

// The slice of the engine the analysis actually calls. Structural on purpose:
// the live game's engine context already has these two methods, so it satisfies
// this without an adapter, and a test can pass a plain object of stubs. Nothing
// here knows about workers, WASM or React.
export type AnalysisEngine = {
  getBestMove: (fen: string, depth: number) => Promise<string>;
  evaluatePosition: (fen: string, depth: number) => Promise<number>;
};

// What analyzeMove computes about one move. Deliberately carries no ply, colour
// or column name: it is the position-and-move primitive Phase 5's live coach
// reuses with a single candidate move, not a row of a saved game.
export type MoveAnalysisResult = {
  engineBestUci: string;
  evalBefore: number;
  evalAfter: number;
  evalLoss: number;
  classification: Classification;
};

// A row of move_analyses, minus the columns the database fills for itself (id,
// game_id, created_at). snake_case because these are column names, not
// identifiers of ours: the save route inserts the array as-is, the same
// contract SaveGamePayload keeps in lib/game/save.ts.
export type MoveAnalysis = {
  ply: number;
  move_uci: string;
  engine_best_uci: string;
  eval_before: number;
  eval_after: number;
  eval_loss: number;
  classification: Classification;
  is_user_move: boolean;
};
