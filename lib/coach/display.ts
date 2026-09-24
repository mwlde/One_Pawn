// Turns stored commentary back into rows a coach view can render. Pure: it joins
// each commentary note to its analysis row (for the classification and the
// engine's move) and to the replay's positions (for SAN), so both the post-game
// screen and the profile replay build their list the same way.

import { Chess } from "chess.js";

import { formatMoveLabel } from "@/lib/analysis/display";
import type { Classification, MoveAnalysis } from "@/lib/analysis/types";
import { parseEngineMove } from "@/lib/game/engine-move";

import type { CommentaryFailure } from "./client";
import type { CommentaryReason, StoredMoveCommentary } from "./types";

// What each failure says on screen. Kept apart from the transport that names
// them: the reasons are facts about the request, these are sentences for a
// student who does not know what Groq is and should not have to.
export const COMMENTARY_FAILURE_MESSAGE: Record<CommentaryFailure, string> = {
  groq: "The coach could not write up this game. This usually clears on a second try.",
  network: "The request did not reach the server. Check your connection and try again.",
  not_analyzed: "This game needs analysing before the coach can write about it.",
  server: "Something went wrong while saving the commentary.",
  refused: "The coach is not available for this game.",
  // A plain fallback. The screens that hit this build a richer sentence with the
  // reset time and the count; this stands in only if that ever cannot be built.
  rate_limited: "You've used your coach analyses for today. They reset within a day.",
};

// How each reason reads as a heading. blunder/mistake/inaccuracy repeat the
// classification badge, so the view shows a reason heading only for the two that
// the badge cannot express: the best move and the turning point.
export const REASON_DISPLAY: Record<CommentaryReason, string> = {
  blunder: "Blunder",
  mistake: "Mistake",
  inaccuracy: "Inaccuracy",
  best_move: "Best move",
  critical_moment: "Turning point",
};

// The reasons whose heading adds something the classification badge does not.
export function reasonAddsHeading(reason: CommentaryReason): boolean {
  return reason === "best_move" || reason === "critical_moment";
}

// Words that end in a full stop without ending the sentence.
const ABBREVIATIONS = new Set(["e.g", "i.e", "vs", "cf"]);

// A move number with its dots so far: "12", "1..".
const MOVE_NUMBER = /^\d+\.*$/;

// A move in SAN, with any check, mate or annotation marks already read.
const SAN_MOVE = /^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?[!?]*$/;

// The word that ends just before `index`, back to the previous whitespace.
function wordBefore(text: string, index: number): string {
  let start = index;
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  return text.slice(start, index);
}

// The opening sentence of a note, for the collapsed row in the coach's notes.
// A full stop ends the sentence unless the word before it is a move number
// ("12. Nxd4", "1... e5") or an abbreviation ("e.g."). A move before it does
// end the sentence: "The best move was Nf3." An exclamation or question mark
// straight after a move is an annotation ("Nf3!", "e4?!"), not an ending.
// Written as a scan rather than a lookbehind regex, which older Safari cannot
// parse at all.
//
// Text with no sentence end this can find comes back whole. A slightly long
// excerpt is a better failure than an empty one.
export function firstSentence(text: string): string {
  const trimmed = text.trim();

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char !== "." && char !== "!" && char !== "?") continue;

    const word = wordBefore(trimmed, index);
    if (char === ".") {
      if (MOVE_NUMBER.test(word)) continue;
      if (ABBREVIATIONS.has(word.toLowerCase())) continue;
    } else if (SAN_MOVE.test(word)) {
      continue;
    }

    const after = trimmed[index + 1];
    if (after === undefined) return trimmed;
    if (!/\s/.test(after)) continue;

    return trimmed.slice(0, index + 1);
  }

  return trimmed;
}

export type NotableDisplay = {
  ply: number;
  // "12. Nf3" style label.
  label: string;
  classification: Classification;
  reason: CommentaryReason;
  commentary: string;
  // The engine's move in SAN, or null when the engine agreed with the move
  // played.
  bestSan: string | null;
};

// A single classified move without commentary. The coach view falls back to a
// list of these when Groq could not produce commentary but the analysis is
// present: the classifications are reliable and still worth showing.
export type ClassificationDisplay = {
  ply: number;
  label: string;
  classification: Classification;
  bestSan: string | null;
  evalLoss: number;
};

function toSan(fenBefore: string, uci: string): string | null {
  const parsed = parseEngineMove(uci);
  if (parsed === null) return null;
  const chess = new Chess(fenBefore);
  try {
    return chess.move(parsed).san;
  } catch {
    return null;
  }
}

export function buildNotableDisplay(
  commentary: StoredMoveCommentary[],
  analyses: MoveAnalysis[],
  fens: string[],
  sanByPly: string[],
): NotableDisplay[] {
  const analysisByPly = new Map<number, MoveAnalysis>();
  for (const row of analyses) analysisByPly.set(row.ply, row);

  return [...commentary]
    .sort((a, b) => a.ply - b.ply)
    .map((note) => {
      const analysis = analysisByPly.get(note.ply);
      const playedSan = sanByPly[note.ply - 1] ?? analysis?.move_uci ?? "";
      const fenBefore = fens[note.ply - 1] ?? "";

      // Without the analysis row there is no engine move or classification to
      // show, but the note itself still stands, so it degrades to a plain line
      // rather than being dropped.
      const engineBestUci = analysis?.engine_best_uci ?? "";
      const playedBest = engineBestUci === "" || engineBestUci === analysis?.move_uci;
      const bestSan = playedBest ? null : (toSan(fenBefore, engineBestUci) ?? engineBestUci);

      return {
        ply: note.ply,
        label: formatMoveLabel(note.ply, playedSan),
        classification: analysis?.classification ?? "good",
        reason: note.reason,
        commentary: note.commentary,
        bestSan,
      };
    });
}

// The plain classification list, in ply order: every analysed user move with its
// tier and the engine's move, no commentary. Used for the degraded coach view.
export function buildClassificationDisplay(
  analyses: MoveAnalysis[],
  fens: string[],
  sanByPly: string[],
): ClassificationDisplay[] {
  return [...analyses]
    .filter((row) => row.is_user_move)
    .sort((a, b) => a.ply - b.ply)
    .map((row) => {
      const fenBefore = fens[row.ply - 1] ?? "";
      const playedSan = sanByPly[row.ply - 1] ?? row.move_uci;
      const playedBest = row.engine_best_uci === row.move_uci;
      const bestSan = playedBest ? null : (toSan(fenBefore, row.engine_best_uci) ?? row.engine_best_uci);
      return {
        ply: row.ply,
        label: formatMoveLabel(row.ply, playedSan),
        classification: row.classification,
        bestSan,
        evalLoss: row.eval_loss,
      };
    });
}
