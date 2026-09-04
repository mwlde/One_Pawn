"use client";

import { useEffect, useRef } from "react";

type MoveHistoryProps = {
  // SAN, in play order, straight from chess.js history().
  moves: string[];
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

export function MoveHistory({ moves }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest move in view. Without this a long game silently grows past
  // the bottom of the panel and shows only its opening.
  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) return;
    element.scrollTop = element.scrollHeight;
  }, [moves.length]);

  const pairs = toPairs(moves);
  const lastIndex = moves.length - 1;
  const highlight = (index: number) => (index === lastIndex ? "bg-ink px-1 text-panel" : "");

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
            <li key={pair.number} className="grid grid-cols-[32px_1fr_1fr] gap-x-2">
              <span className="text-right text-muted">{pair.number}.</span>
              <span className={highlight(pair.white.index)}>{pair.white.san}</span>
              <span className={pair.black === null ? "" : highlight(pair.black.index)}>
                {pair.black?.san ?? ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
