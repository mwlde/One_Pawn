"use client";

import { DEFAULT_POSITION } from "chess.js";

import { GameBoard } from "@/components/board/GameBoard";

const REJECT_DROP = () => false;

// The opening position with nothing movable, for places that show the product
// without offering a game: the mobile landing hero. A client component only
// because the board is one, so a server page can place it without passing a
// callback across the boundary.
export function StaticBoard() {
  return (
    <GameBoard
      fen={DEFAULT_POSITION}
      orientation="white"
      movableColor={null}
      onDrop={REJECT_DROP}
      animate={false}
    />
  );
}
