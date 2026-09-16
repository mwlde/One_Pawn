// The shape of a lesson, shared by the JSON files under content/lessons/ and the
// code that plays them. Lessons are static content: nothing here is written by
// users, and nothing here changes at runtime.

export type Track = "basics" | "openings" | "tactics" | "endgames";

// Also the folder names under content/lessons/, so a lesson's track must match
// the folder its file sits in.
export const TRACKS: readonly Track[] = ["basics", "openings", "tactics", "endgames"];

// Long algebraic notation, the format the WASM engine speaks: "e2e4", or
// "e7e8q" for a promotion. parseEngineMove in lib/game/engine-move.ts turns one
// into the object chess.js wants, so lessons need no second move format.
export type UciMove = string;

export type HintLevel = "nudge" | "tell";

// A nudge points at what to look at. A tell names the move. A step lists its
// hints general to specific, and the player reveals them in that order.
export type Hint = {
  text: string;
  level: HintLevel;
};

type StepBase = {
  // Unique within the lesson, not across lessons.
  id: string;
  // Every step carries its own position rather than continuing from the last.
  // Steps can then be replayed or reordered alone, and a step never depends on
  // which of several accepted moves the user played before it.
  fen: string;
  instruction: string;
  // Shown once the step is done. Says why, not just that.
  explanation: string;
};

// The user must play a legal move, and any move in acceptedMoves completes the
// step. There is no privileged "expected" move: when several moves are right,
// they are equally right.
export type MoveStep = StepBase & {
  kind: "move";
  // At least one, so a user stuck on a move step always has a way forward.
  hints: [Hint, ...Hint[]];
  acceptedMoves: [UciMove, ...UciMove[]];
  // A scripted move for the other side, played after the user's move and
  // before the explanation. It must be legal after every accepted move, not
  // only the first.
  opponentReply?: UciMove;
};

// The user is asked to try a move the rules forbid, so the lesson can show
// that it fails. Kept as its own kind so that an illegal move in acceptedMoves
// stays a content error a check can catch, instead of silently becoming this.
//
// attemptedMove is illegal in the step's position, so chess.js rejects it
// before any lesson logic sees it. The player must therefore treat two inputs
// as the same trigger for the explanation: input that matches attemptedMove,
// and any input chess.js rejects. Only a legal move counts as a mistake here.
export type AttemptStep = StepBase & {
  kind: "attempt";
  attemptedMove: UciMove;
  // Optional: the instruction already names the move to try.
  hints?: Hint[];
};

export type LessonStep = MoveStep | AttemptStep;

export type Lesson = {
  // Stable forever once shipped, because progress rows reference it. Unique
  // across all tracks, and the same as the file name without ".json".
  id: string;
  track: Track;
  title: string;
  // Position within the track, starting at 1.
  order: number;
  description: string;
  steps: [LessonStep, ...LessonStep[]];
};

// One user's record of finishing one lesson. Only facts about the run are
// stored. Whether the run was perfect is derived from usedHints, never stored
// as its own flag: the definition of a perfect run can then change without
// rewriting every saved row.
export type LessonCompletion = {
  lessonId: string;
  // ISO 8601, as it arrives from Supabase.
  completedAt: string;
  usedHints: boolean;
  // Wrong moves played across all steps. On an attempt step, only a legal move
  // counts, because any illegal one completes the step.
  mistakeCount: number;
};
