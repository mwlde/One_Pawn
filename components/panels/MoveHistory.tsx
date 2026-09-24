"use client";

import { useEffect, useRef } from "react";

import type { Classification } from "@/lib/analysis/types";

type MoveHistoryProps = {
  // SAN, in play order, straight from chess.js history().
  moves: string[];
  // Which ply is highlighted, as an index into `moves`. Defaults to the last
  // move played, which is what a live game wants. The replay screen passes the
  // ply it is currently showing instead.
  activeIndex?: number;
  // Supplied only where the moves are navigable. Without it they are text.
  onSelect?: (index: number) => void;
  // How each analysed move was classified, keyed by the same index as `moves`.
  // Only the user's own moves are in here; the engine's replies are not the
  // user's play to judge, so they carry no mark. Absent during a live game.
  classifications?: ReadonlyMap<number, Classification>;
};

type MovePair = {
  number: number;
  white: { san: string; index: number };
  black: { san: string; index: number } | null;
};

// The mark against a classified move. Square, like everything else on this
// paper, and small enough to scan past: it answers "was there a problem here"
// without competing with the move it belongs to.
//
// Good stays the neutral hairline for the same reason its badge does. A good
// move is the unremarkable baseline, but it still earns a mark, because the
// absence of one has to keep meaning "not analysed".
const DOT_COLORS: Record<Classification, string> = {
  best: "#4f7a3f",
  excellent: "#7d9a6b",
  good: "var(--color-hairline)",
  inaccuracy: "#b08a1c",
  mistake: "#c06a22",
  blunder: "#b03226",
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

export function MoveHistory({ moves, activeIndex, onSelect, classifications }: MoveHistoryProps) {
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
    const highlight = move.index === active ? "rounded-sm bg-highlight px-1 text-ink" : "";
    const classification = classifications?.get(move.index);

    // The dot sits outside the highlight, so the inverted background of the
    // selected move never lands behind a colour it was not designed for. It is
    // decorative: the classification reaches a screen reader through the move's
    // own label, because colour alone cannot carry it.
    const dot =
      classification === undefined ? null : (
        <span
          aria-hidden
          className="size-[5px] shrink-0"
          style={{ backgroundColor: DOT_COLORS[classification] }}
        />
      );

    const label =
      classification === undefined ? move.san : `${move.san}, ${classification}`;

    const text =
      onSelect === undefined ? (
        <span className={highlight}>{move.san}</span>
      ) : (
        <button
          type="button"
          aria-label={label}
          onClick={() => onSelect(move.index)}
          className={`text-left hover:underline ${highlight}`}
        >
          {move.san}
        </button>
      );

    return (
      <span className="flex min-w-0 items-center gap-1">
        {text}
        {dot}
      </span>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto px-2 py-3 font-mono text-xs"
    >
      {moves.length === 0 ? (
        <p className="px-2 font-sans text-xs text-muted">No moves yet. White to play.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {pairs.map((pair) => (
            <li
              key={pair.number}
              ref={
                pair.white.index === active || pair.black?.index === active ? activeRef : null
              }
              className="grid grid-cols-[32px_1fr_1fr] gap-x-2"
            >
              <span className="text-right text-graphite">{pair.number}.</span>
              {cell(pair.white)}
              {cell(pair.black)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
