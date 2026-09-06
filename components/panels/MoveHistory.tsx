"use client";

import { useEffect, useRef } from "react";

type MoveHistoryProps = {
  // SAN, in play order, straight from chess.js history().
  moves: string[];
  // Which ply is highlighted, as an index into `moves`. Defaults to the last
  // move played, which is what a live game wants. The replay screen passes the
  // ply it is currently showing instead.
  activeIndex?: number;
  // Supplied only where the moves are navigable. Without it they are text.
  onSelect?: (index: number) => void;
};

type MovePair = {
  number: number;
  white: { san: string; index: number };
  black: { san: string; index: number } | null;
};

function toPairs(moves: string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let index = 0; index < moves.length; index += 2) {
    const black = moves[index + 1];
    pairs.push({
      number: index / 2 + 1,
      white: { san: moves[index], index },
      black: black === undefined ? null : { san: black, index: index + 1 },
    });
  }
  return pairs;
}

export function MoveHistory({ moves, activeIndex, onSelect }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const active = activeIndex ?? moves.length - 1;

  // Two behaviours, because the two callers want different things. A live game
  // wants the bottom of the list, unconditionally, as moves append. A replay
  // wants whichever row it is showing, which can be anywhere, and must not drag
  // the page around when that row is already visible.
  useEffect(() => {
    if (activeIndex === undefined) {
      const element = scrollRef.current;
      if (element === null) return;
      element.scrollTop = element.scrollHeight;
      return;
    }
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, moves.length]);

  const pairs = toPairs(moves);

  function cell(move: { san: string; index: number } | null) {
    if (move === null) return null;
    const highlight = move.index === active ? "bg-ink px-1 text-panel" : "";

    if (onSelect === undefined) return <span className={highlight}>{move.san}</span>;

    return (
      <button
        type="button"
        onClick={() => onSelect(move.index)}
        className={`text-left hover:underline ${highlight}`}
      >
        {move.san}
      </button>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto px-2 py-3 font-mono text-xs"
    >
      {moves.length === 0 ? (
        <p className="px-2 text-[11px] text-muted">No moves yet.</p>
      ) : (
        <ol className="flex flex-col gap-[3px]">
          {pairs.map((pair) => (
            <li
              key={pair.number}
              ref={
                pair.white.index === active || pair.black?.index === active ? activeRef : null
              }
              className="grid grid-cols-[32px_1fr_1fr] gap-x-2"
            >
              <span className="text-right text-muted">{pair.number}.</span>
              {cell(pair.white)}
              {cell(pair.black)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
