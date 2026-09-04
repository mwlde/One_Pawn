"use client";

import { useMemo } from "react";
import { Chessboard } from "react-chessboard";

import type { Side } from "@/lib/game/settings";

type GameBoardProps = {
  fen: string;
  orientation: Side;
  // The colour the player may pick up. Null locks the board entirely, which is
  // what the engine's turn and a finished game both want.
  movableColor: "w" | "b" | null;
  onDrop: (from: string, to: string) => boolean;
};

// Square corners and the wireframe's two board tones. react-chessboard sizes
// itself to its container, so the parent owns how big the board gets.
const BOARD_STYLE = { border: "1px solid var(--color-ink)" };
const LIGHT_SQUARE_STYLE = { backgroundColor: "var(--color-surface)" };
const DARK_SQUARE_STYLE = { backgroundColor: "var(--color-tint)" };
const NOTATION_STYLE = { fontFamily: "var(--font-mono)", fontSize: "9px" };

export function GameBoard({ fen, orientation, movableColor, onDrop }: GameBoardProps) {
  const options = useMemo(
    () => ({
      id: "game-board",
      position: fen,
      boardOrientation: orientation,
      allowDragging: movableColor !== null,
      allowDrawingArrows: false,
      showNotation: true,
      boardStyle: BOARD_STYLE,
      lightSquareStyle: LIGHT_SQUARE_STYLE,
      darkSquareStyle: DARK_SQUARE_STYLE,
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
    [fen, orientation, movableColor, onDrop],
  );

  return <Chessboard options={options} />;
}
