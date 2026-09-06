"use client";

import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";

import { GameBoard } from "@/components/board/GameBoard";
import { MoveHistory } from "@/components/panels/MoveHistory";
import type { Side } from "@/lib/game/settings";

export type MetaItem = { label: string; value: string };

type GameReplayProps = {
  pgn: string;
  orientation: Side;
  meta: readonly MetaItem[];
};

// The board is read-only here, so nothing can be dropped on it. GameBoard locks
// dragging when movableColor is null and never calls this, but the prop is
// required: a shared component that both screens use should not grow an
// optional callback to describe a board that cannot be touched.
const REJECT_DROP = () => false;

// Same sizing rule as the play screen: capped by whichever runs out first, the
// column's width or the viewport's height, so the board can never force a
// horizontal scrollbar.
const BOARD_SIZE = "min(100%, calc(100dvh - 14rem))";

type Replay = {
  // SAN, in play order.
  moves: string[];
  // One more entry than there are moves: fens[0] is the starting position and
  // fens[n] is the position after move n. That off-by-one is deliberate and is
  // what makes the ply counter directly indexable.
  fens: string[];
};

// Every position is built once, when the PGN arrives, rather than replayed on
// each step. A game is at most a few hundred positions and stepping through
// them is then an array index instead of a walk from move one.
function buildReplay(pgn: string): Replay | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    // A PGN this app did not write, or one written by a version of chess.js
    // that disagrees with this one. Either way there is no game to show.
    return null;
  }

  const history = chess.history({ verbose: true });
  return {
    moves: history.map((move) => move.san),
    // `before` rather than a fresh Chess().fen(), so a PGN carrying its own
    // starting position would still be replayed from the right one.
    fens: [history[0]?.before ?? chess.fen(), ...history.map((move) => move.after)],
  };
}

function ControlButton({
  label,
  symbol,
  disabled,
  onClick,
}: {
  label: string;
  symbol: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex-1 border border-ink py-2 font-mono text-xs hover:bg-tint disabled:cursor-not-allowed disabled:border-hairline disabled:text-hairline disabled:hover:bg-transparent"
    >
      {symbol}
    </button>
  );
}

export function GameReplay({ pgn, orientation, meta }: GameReplayProps) {
  const replay = useMemo(() => buildReplay(pgn), [pgn]);
  const [ply, setPly] = useState(0);

  const lastPly = replay === null ? 0 : replay.fens.length - 1;

  // Arrow keys, per the wireframe's scrubber note. The slider handles its own
  // arrows, so a key pressed while it is focused is left alone rather than
  // moving twice.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") setPly((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setPly((current) => Math.min(lastPly, current + 1));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastPly]);

  if (replay === null) {
    return (
      <p className="border border-ink bg-panel px-4 py-3 text-xs">
        This game&apos;s moves could not be read, so it cannot be replayed.
      </p>
    );
  }

  const atStart = ply === 0;
  const atEnd = ply === lastPly;

  return (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[1fr_340px]">
      <div className="flex min-h-0 flex-col gap-3 p-3 md:p-5">
        <div className="flex justify-center">
          <div className="aspect-square" style={{ width: BOARD_SIZE }}>
            <GameBoard
              fen={replay.fens[ply]}
              orientation={orientation}
              movableColor={null}
              onDrop={REJECT_DROP}
            />
          </div>
        </div>

        <div className="mx-auto w-full border border-ink bg-panel p-3.5" style={{ maxWidth: BOARD_SIZE }}>
          <div className="mb-2 flex justify-between font-mono text-[10px] text-muted">
            <span>
              MOVE {ply} / {lastPly}
            </span>
            <span>{atStart ? "starting position" : replay.moves[ply - 1]}</span>
          </div>

          <input
            type="range"
            min={0}
            max={lastPly}
            value={ply}
            disabled={lastPly === 0}
            aria-label="Move"
            onChange={(event) => setPly(Number(event.target.value))}
            className="w-full accent-ink"
          />

          <div className="mt-3 flex gap-2">
            <ControlButton label="First move" symbol="⏮" disabled={atStart} onClick={() => setPly(0)} />
            <ControlButton
              label="Previous move"
              symbol="◀"
              disabled={atStart}
              onClick={() => setPly(ply - 1)}
            />
            <ControlButton
              label="Next move"
              symbol="▶"
              disabled={atEnd}
              onClick={() => setPly(ply + 1)}
            />
            <ControlButton
              label="Last move"
              symbol="⏭"
              disabled={atEnd}
              onClick={() => setPly(lastPly)}
            />
          </div>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col border-t border-dashed border-hairline md:border-l md:border-t-0">
        <dl className="shrink-0 border-b border-dashed border-hairline px-4 py-3.5 font-mono text-[11px]">
          {meta.map((item) => (
            <div key={item.label} className="flex justify-between py-1">
              <dt className="text-muted">{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="shrink-0 border-b border-dashed border-hairline px-4 py-3 text-center text-xs font-semibold">
          Moves
        </div>
        {/* activeIndex is the move that produced the position on the board, so
            it trails the ply by one and is -1 at the starting position. */}
        <MoveHistory
          moves={replay.moves}
          activeIndex={ply - 1}
          onSelect={(index) => setPly(index + 1)}
        />
      </aside>
    </div>
  );
}
