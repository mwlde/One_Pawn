"use client";

import { useMemo } from "react";
import { Chessboard } from "react-chessboard";

import type { BoardArrow } from "@/lib/analysis/arrows";
import type { Side } from "@/lib/game/settings";

type GameBoardProps = {
  fen: string;
  orientation: Side;
  // The colour the player may pick up. Null locks the board entirely, which is
  // what the engine's turn and a finished game both want.
  movableColor: "w" | "b" | null;
  onDrop: (from: string, to: string) => boolean;
  // Whether a position change slides the pieces. Off for a jump to an unrelated
  // position, where sliding would act out moves nobody played.
  animate?: boolean;
  // Arrows drawn over the position. Empty on every screen but the coach view.
  arrows?: readonly BoardArrow[];
  // The squares the last move left and landed on, tinted over either square
  // colour. Null before the first move.
  lastMove?: { from: string; to: string } | null;
};

// Square corners, a hairline edge and the palette's two board tones.
// react-chessboard sizes itself to its container, so the parent owns how big
// the board gets.
const BOARD_STYLE = { border: "1px solid var(--rule-strong)" };
const LIGHT_SQUARE_STYLE = { backgroundColor: "var(--board-light)" };
const DARK_SQUARE_STYLE = { backgroundColor: "var(--board-dark)" };
const NOTATION_STYLE = { fontFamily: "var(--font-mono)", fontSize: "10px" };
// The library's defaults assume its own brown board, which left several
// labels invisible on ours. Each label takes the opposite square's tone.
const LIGHT_SQUARE_NOTATION_STYLE = { color: "var(--board-dark)" };
const DARK_SQUARE_NOTATION_STYLE = { color: "var(--board-light)" };
const LAST_MOVE_STYLE = { backgroundColor: "var(--board-last-move)" };

const NO_ARROWS: readonly BoardArrow[] = [];

// react-chessboard takes these as one object with no merging of its own, so a
// partial override would leave the rest undefined and the arrow geometry NaN.
// All ten values are given even where they match the library's defaults.
//
// opacity is 1 because the library applies it to every arrow at once, and the
// coach view needs the engine's suggestion to read fainter than the move that
// was played. That difference lives in the arrow colour's alpha instead.
const ARROW_OPTIONS = {
  color: "#b03226",
  secondaryColor: "#4f7a3f",
  tertiaryColor: "#3f5f8a",
  arrowLengthReducerDenominator: 8,
  sameTargetArrowLengthReducerDenominator: 4,
  // Slimmer than the library's 5. Two arrows share the board here, often from
  // the same square, and the default width has them swallow each other.
  arrowWidthDenominator: 6,
  activeArrowWidthMultiplier: 0.9,
  opacity: 1,
  activeOpacity: 1,
  // Starts the arrow near the base of the piece rather than dead centre, so the
  // piece the move is about stays readable underneath it.
  arrowStartOffset: 0.3,
};

export function GameBoard({
  fen,
  orientation,
  movableColor,
  onDrop,
  animate = true,
  arrows = NO_ARROWS,
  lastMove = null,
}: GameBoardProps) {
  const options = useMemo(
    () => ({
      id: "game-board",
      position: fen,
      boardOrientation: orientation,
      allowDragging: movableColor !== null,
      allowDrawingArrows: false,
      arrows: [...arrows],
      arrowOptions: ARROW_OPTIONS,
      showAnimations: animate,
      showNotation: true,
      boardStyle: BOARD_STYLE,
      lightSquareStyle: LIGHT_SQUARE_STYLE,
      darkSquareStyle: DARK_SQUARE_STYLE,
      squareStyles:
        lastMove === null ? {} : { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE },
      lightSquareNotationStyle: LIGHT_SQUARE_NOTATION_STYLE,
      darkSquareNotationStyle: DARK_SQUARE_NOTATION_STYLE,
      alphaNotationStyle: NOTATION_STYLE,
      numericNotationStyle: NOTATION_STYLE,
      canDragPiece: ({ piece }: { piece: { pieceType: string } }) =>
        movableColor !== null && piece.pieceType[0] === movableColor,
      // Returning false tells react-chessboard to snap the piece back, which is
      // what an illegal move should do. The caller decides legality.
      onPieceDrop: ({
        sourceSquare,
        targetSquare,
      }: {
        sourceSquare: string;
        targetSquare: string | null;
      }) => (targetSquare === null ? false : onDrop(sourceSquare, targetSquare)),
    }),
    [fen, orientation, movableColor, onDrop, animate, arrows, lastMove],
  );

  return <Chessboard options={options} />;
}
