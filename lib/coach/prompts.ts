// Prompt builders for the Coach. Two of them: one for the whole-game summary,
// one for a single notable move. Each returns a fixed system prompt and a user
// prompt built from structured data.
//
// ANTI-HALLUCINATION GUARDRAILS. The system prompts below are the only thing
// standing between the engine's reliable numbers and an LLM's tendency to
// narrate chess it cannot see. Do not weaken them. Specifically, they tell the
// model to:
//   - treat the engine's evaluation as the single source of truth and never
//     disagree with it,
//   - never describe or invent a move the engine did not evaluate,
//   - never assert a piece is "attacked", "hanging" or "defended" from its own
//     reading of the position, because it does not have one; the eval delta is
//     the only evidence it may lean on,
//   - explain a mistake through what the engine's move achieves, not through
//     speculation about what the opponent would have played.
// The structured data is the model's whole world. The system prompt fences it
// in. If a future edit loosens either, the commentary starts making things up.
//
// The system prompts are fixed strings. User-supplied game data goes only in
// the user prompt, never spliced into the system prompt (CLAUDE.md: user input
// is a separate message, never concatenated into the system prompt). This bounds
// what a crafted PGN could do to at most the user message.

import type { Classification } from "@/lib/analysis/types";
import { formatMoveLabel } from "@/lib/analysis/display";
import type { Side } from "@/lib/game/settings";

import type { CommentaryReason } from "./types";

export type Prompt = {
  system: string;
  user: string;
};

// The shared persona. Both prompts open with this so the coach reads the same
// whether it is summing up a game or explaining one move.
const PERSONA = [
  "You are a chess coach giving feedback on a game a student has just finished against a computer opponent.",
  "You are patient and direct. You do not flatter. You do not open with praise like \"great game\" or \"well played\".",
  "A chess engine has already analysed the game. Its assessment is the ground truth. Never disagree with the engine.",
  "",
  "Hard rules you must follow:",
  "- Base every claim on the engine data you are given. Do not describe or refer to any move the engine did not evaluate.",
  "- Do not claim a piece is attacked, hanging, defended, pinned or forked. You cannot see the board. The engine's evaluation change is your only evidence for whether a move was good or bad.",
  "- When a move lost evaluation, explain it through what the engine's suggested move achieves, not by guessing what the opponent would have done next.",
  "- Do not invent variations, move sequences or piece names beyond the moves you are explicitly given.",
  "- Write in British English. Use short sentences. Do not use em-dashes.",
].join("\n");

// Centipawns are the engine's unit. A short gloss keeps the model from
// misreading the number as anything else without inviting it to theorise.
const CP_NOTE =
  "Evaluations are in centipawns from the student's point of view: 100 centipawns is roughly the value of a pawn. A larger eval loss means a worse move.";

function colorName(side: Side): string {
  return side === "white" ? "White" : "Black";
}

// One classification line for the summary's move list, e.g. "12. Nf3 - mistake".
function summaryMoveLine(ply: number, san: string, classification: Classification): string {
  return `${formatMoveLabel(ply, san)} - ${classification}`;
}

export type SummaryInput = {
  pgn: string;
  userColor: Side;
  // A human label for the opponent's strength, e.g. "Medium (depth 5)". Kept as
  // a ready-made string so this module does not reach into settings.
  difficulty: string;
  // Every analysed move, in ply order: its 1-indexed ply, its SAN, and how the
  // engine classified it.
  moves: { ply: number; san: string; classification: Classification }[];
};

export function buildSummaryPrompt(input: SummaryInput): Prompt {
  const system = [
    PERSONA,
    "",
    "Task: write a short summary of how the student played.",
    "Length: 2 to 4 sentences. No more.",
    "Cover the shape of the game: where the student played well, where it went wrong, and one concrete takeaway.",
    "Do not list every move. Do not give a move-by-move account. Do not end with a cheerful sign-off.",
    CP_NOTE,
  ].join("\n");

  const moveList =
    input.moves.length === 0
      ? "(no moves by the student were analysed)"
      : input.moves
          .map((move) => summaryMoveLine(move.ply, move.san, move.classification))
          .join("\n");

  const user = [
    `The student played ${colorName(input.userColor)} against the computer on ${input.difficulty}.`,
    "",
    "The student's moves, with the engine's classification of each:",
    moveList,
    "",
    "Full game in PGN, for context only. Do not quote moves from it that are not in the list above:",
    input.pgn,
  ].join("\n");

  return { system, user };
}

// What each reason asks the model to focus on. The instruction is deliberately
// framed around the engine's move, not the position, to keep the model on the
// evidence it has.
const REASON_TASK: Record<CommentaryReason, string> = {
  blunder:
    "This move is a blunder: it lost a large amount of evaluation. Explain what the engine's suggested move would have achieved instead, and why the played move fell so far short.",
  mistake:
    "This move is a mistake: it lost evaluation. Explain what the engine's suggested move would have achieved instead.",
  inaccuracy:
    "This move is an inaccuracy: it gave up a little evaluation. Explain briefly what the engine's suggested move would have kept.",
  best_move:
    "This was the student's best move of the game: it matched or nearly matched the engine. Explain what the move achieves.",
  critical_moment:
    "This was the turning point of the game, where the evaluation swung the most. Explain what was at stake in this position, using only the evaluation change as evidence.",
};

export type MoveCommentaryInput = {
  ply: number;
  userColor: Side;
  // FEN of the position the move was played from. Given so the model knows whose
  // turn it was and roughly where the game stood, not so it reads the board.
  fenBefore: string;
  // SAN of the move the student played, and the move the engine preferred. SAN,
  // not UCI, so the model writes moves the way a player reads them.
  playedMove: string;
  engineBestMove: string;
  classification: Classification;
  evalLossCp: number;
  reason: CommentaryReason;
};

export function buildMoveCommentaryPrompt(input: MoveCommentaryInput): Prompt {
  const system = [
    PERSONA,
    "",
    "Task: explain one move to the student.",
    "Length: 2 to 3 sentences. No more.",
    "Do not re-analyse the position or offer your own evaluation. Use the engine's assessment as given.",
    CP_NOTE,
  ].join("\n");

  // "the engine agreed with this move" reads better than naming the same move
  // twice when the student found the top choice.
  const engineLine =
    input.engineBestMove === input.playedMove
      ? "The engine agreed with this move."
      : `The engine preferred ${input.engineBestMove}.`;

  const user = [
    `Position (FEN, for turn and context only): ${input.fenBefore}`,
    `Student is playing: ${colorName(input.userColor)}`,
    `Move played: ${formatMoveLabel(input.ply, input.playedMove)}`,
    engineLine,
    `Engine classification: ${input.classification}`,
    `Evaluation lost by this move: ${input.evalLossCp} centipawns`,
    "",
    REASON_TASK[input.reason],
  ].join("\n");

  return { system, user };
}
