// Turns stored commentary back into rows a coach view can render. Pure: it joins
// each commentary note to its analysis row (for the classification and the
// engine's move) and to the replay's positions (for SAN), so both the post-game
// screen and the profile replay build their list the same way.

import { Chess } from "chess.js";

import { formatMoveLabel } from "@/lib/analysis/display";
import type { Classification, MoveAnalysis } from "@/lib/analysis/types";
import { parseEngineMove } from "@/lib/game/engine-move";

import type { CommentaryReason, StoredMoveCommentary } from "./types";

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
