// The arrows a notable move draws on the replay board: the move the player
// made, and the move the engine preferred. Pure, so the colour rules and the
// "engine agreed" case can be tested without mounting a board.

import { parseEngineMove } from "@/lib/game/engine-move";

import type { Classification, MoveAnalysis } from "./types";

// react-chessboard's Arrow shape, redeclared rather than imported. Three
// strings are not worth a dependency edge from lib into a rendering library,
// and GameBoard is the only thing that hands these to the board.
export type BoardArrow = {
  startSquare: string;
  endSquare: string;
  color: string;
};

// The played move's colour, by how the move was classified. These are louder
// than the badge tones in display.ts on purpose: a badge sits on paper at 9px,
// an arrow sits on a board tone and has to read at a glance. They are still
// desaturated enough not to fight the monochrome scheme.
//
// "Good" is the unremarkable baseline and stays neutral, matching the badge.
const PLAYED_COLORS: Record<Classification, string> = {
  best: "#4f7a3f",
  excellent: "#4f7a3f",
  good: "#6b6b6b",
  inaccuracy: "#b08a1c",
  mistake: "#c06a22",
  blunder: "#b03226",
};

// The engine's suggestion. One colour whatever the move was, because it always
// means the same thing, and carried at partial alpha so it reads as the
// alternative rather than as something that happened. The alpha is in the
// colour because react-chessboard applies opacity per board, not per arrow.
export const ENGINE_ARROW_COLOR = "rgba(63, 95, 138, 0.62)";

// For a legend that has to name the colour the board is actually drawing.
export function playedArrowColor(classification: Classification): string {
  return PLAYED_COLORS[classification];
}

function squares(uci: string): { from: string; to: string } | null {
  const move = parseEngineMove(uci);
  return move === null ? null : { from: move.from, to: move.to };
}

// Both arrows for one analysed move, engine first so the played move paints
// over it where they overlap. Returns an empty list when there is no analysis
// for the position, which is what every non-notable position gets.
//
// A move the engine agreed with draws one arrow, not two identical ones.
export function buildMoveArrows(analysis: MoveAnalysis | null | undefined): BoardArrow[] {
  if (analysis === null || analysis === undefined) return [];

  const played = squares(analysis.move_uci);
  if (played === null) return [];

  const arrows: BoardArrow[] = [];
  const engine = squares(analysis.engine_best_uci);

  if (engine !== null && analysis.engine_best_uci !== analysis.move_uci) {
    arrows.push({ startSquare: engine.from, endSquare: engine.to, color: ENGINE_ARROW_COLOR });
  }

  arrows.push({
    startSquare: played.from,
    endSquare: played.to,
    color: PLAYED_COLORS[analysis.classification],
  });

  return arrows;
}
