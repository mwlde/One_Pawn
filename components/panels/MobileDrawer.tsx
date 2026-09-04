"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

type MobileDrawerProps = {
  // Shown in the peek, next to the drag hint. The wireframe uses the last move.
  summary: string;
  children: ReactNode;
};

// Distance in pixels that separates a drag from a tap on the handle.
const DRAG_THRESHOLD = 24;

// The mobile panel from wireframe 02m. Stacking the eval bar, move list and
// buttons under the board was considered and rejected there, because it shrinks
// the board and pushes the clock below the fold; the drawer keeps the board
// full-width and puts the last move in a peek instead.
//
// It opens and closes instantly. Sheets normally slide, but Stage D takes no
// animations beyond react-chessboard's own.
export function MobileDrawer({ summary, children }: MobileDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const dragStartRef = useRef<number | null>(null);
  // A drag that changes the state also fires a click afterwards. This stops
  // that click from immediately undoing the drag.
  const suppressClickRef = useRef(false);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = event.clientY;
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (start === null) return;

    const delta = event.clientY - start;
    if (Math.abs(delta) < DRAG_THRESHOLD) return;

    suppressClickRef.current = true;
    setExpanded(delta < 0);
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setExpanded((current) => !current);
  };

  return (
    <div className="relative shrink-0 border-t-2 border-ink bg-panel md:hidden">
      {/* Expands upward over the board rather than pushing the layout down.
          Growing in flow would shove the buttons past the bottom of a 375px
          screen, and a sheet is meant to cover content anyway. One fixed snap
          height rather than a natural one, so it always covers the player
          strip outright instead of slicing a clock in half. */}
      {expanded ? (
        <div className="absolute inset-x-0 bottom-full z-10 flex h-[45vh] flex-col border-t-2 border-ink bg-panel">
          {children}
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={expanded}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        className="w-full touch-none px-3.5 pb-2 pt-2.5 text-left"
      >
        <span aria-hidden className="mx-auto mb-2 block h-[3px] w-9 bg-ink" />
        <span className="flex items-baseline justify-between font-mono text-[11px]">
          <span className="font-semibold">Moves</span>
          <span className="text-muted">
            {expanded ? "close ↓" : `${summary} · swipe up ↑`}
          </span>
        </span>
      </button>
    </div>
  );
}
