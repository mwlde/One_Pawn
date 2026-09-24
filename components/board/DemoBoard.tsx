"use client";

import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameBoard } from "@/components/board/GameBoard";

// A few moves of a well-known opening, so the board opens on a developed
// position with pieces out rather than the flat starting row. Each ends with
// White to move, so the visitor is handed a live turn. One is picked at random
// per visit for variety.
const OPENINGS: readonly (readonly string[])[] = [
  ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], // Italian
  ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"], // Ruy Lopez
  ["e4", "c5", "Nf3", "d6", "d4", "cxd4"], // Sicilian
  ["d4", "d5", "c4", "e6", "Nc3", "Nf6"], // Queen's Gambit Declined
  ["e4", "e6", "d4", "d5", "Nc3", "Bb4"], // French, Winawer
];

function buildGame(moves: readonly string[]): Chess {
  const chess = new Chess();
  for (const move of moves) chess.move(move);
  return chess;
}

function randomOpening(): readonly string[] {
  return OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
}

// A self-contained board for the landing page: White is yours to move, and a
// light random-move opponent replies so the position keeps changing. No engine,
// no WASM and no account, on purpose. This is a taste of a live board in front
// of a first-time visitor, not a game worth winning; the real engine is one
// click away on /play.
//
// The first load shows a fixed opening rather than a random one: a random pick
// during render would either mismatch between the server and the client
// (hydration) or need an impure call the render rules forbid. Play again then
// reshuffles to a random opening from a click, where a client-only random is
// allowed.
export function DemoBoard() {
  const chessRef = useRef<Chess>(buildGame(OPENINGS[0]));
  // The initializer builds its own Chess from the opening rather than reading
  // the ref during render.
  const [fen, setFen] = useState(() => buildGame(OPENINGS[0]).fen());
  // True between your move and the reply, so the board cannot be moved twice
  // before the opponent has answered.
  const [thinking, setThinking] = useState(false);

  const publish = useCallback(() => setFen(chessRef.current.fen()), []);

  // Play again picks a fresh random opening. This runs from a click, not render,
  // so a client-only random is fine here.
  const reset = useCallback(() => {
    chessRef.current = buildGame(randomOpening());
    setThinking(false);
    publish();
  }, [publish]);

  // Black's reply: a random legal move a beat after yours, so the board reads as
  // answered rather than frozen. The timer is cleared if this unmounts mid-wait.
  useEffect(() => {
    if (!thinking) return;
    const timer = setTimeout(() => {
      const chess = chessRef.current;
      const moves = chess.moves();
      if (moves.length > 0) {
        chess.move(moves[Math.floor(Math.random() * moves.length)]);
        publish();
      }
      setThinking(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [thinking, publish]);

  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      const chess = chessRef.current;
      if (thinking || chess.turn() !== "w") return false;

      try {
        // Auto-queen: there is no promotion picker on a demo board, and the odds
        // of reaching one here are slim anyway.
        chess.move({ from, to, promotion: "q" });
      } catch {
        // Illegal move: react-chessboard snaps the piece back on false.
        return false;
      }

      publish();
      // Only hand the turn over if there is still a game to answer.
      if (!chess.isGameOver()) setThinking(true);
      return true;
    },
    [thinking, publish],
  );

  // Derived from the published fen, not the mutable ref: reading chessRef during
  // render would tie the board's over-state to a value React does not track.
  const gameOver = useMemo(() => new Chess(fen).isGameOver(), [fen]);

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square w-full">
        <GameBoard
          fen={fen}
          orientation="white"
          movableColor={gameOver || thinking ? null : "w"}
          onDrop={handleDrop}
        />
      </div>
      <p className="text-center text-xs text-graphite">
        {gameOver ? (
          <>
            Game over.{" "}
            <button
              type="button"
              onClick={reset}
              className="underline underline-offset-2 transition-colors hover:text-ink"
            >
              Play again
            </button>
          </>
        ) : (
          "You play White. Drag a piece to move."
        )}
      </p>
    </div>
  );
}
