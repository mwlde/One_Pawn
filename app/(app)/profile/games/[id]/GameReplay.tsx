"use client";

import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";

import { GameBoard } from "@/components/board/GameBoard";
import { CoachView } from "@/components/coach/CoachView";
import { MoveHistory } from "@/components/panels/MoveHistory";
import { buildMoveArrows, ENGINE_ARROW_COLOR, playedArrowColor } from "@/lib/analysis/arrows";
import type { StoredAnalysis } from "@/lib/analysis/client";
import type { Classification } from "@/lib/analysis/types";
import { buildClassificationDisplay, buildNotableDisplay } from "@/lib/coach/display";
import type { GameCommentary } from "@/lib/coach/types";
import type { GameMode } from "@/lib/game/mode";
import type { Side } from "@/lib/game/settings";

import { CoachPanel } from "./CoachPanel";
import { GameAnalysis } from "./GameAnalysis";

export type MetaItem = { label: string; value: string };

type GameReplayProps = {
  gameId: string;
  pgn: string;
  // The user's colour: the board faces this way, and it is which side's moves
  // the analysis classifies.
  orientation: Side;
  // How the game was played. A Coach-mode game with commentary gets the coach
  // view; everything else keeps the plain replay with its side panel.
  mode: GameMode;
  meta: readonly MetaItem[];
  // "You won · 19 moves", for the coach view's heading. The plain replay keeps
  // the result in the meta list where it has always been.
  resultHeading: string;
  // Read on the server, so the page knows which layout it is before it paints
  // one. Both can be empty: nothing is analysed or commentated until someone
  // asks for it, and the panels below offer to do that.
  initialAnalyses: StoredAnalysis[];
  initialCommentary: GameCommentary;
};

type Tab = "moves" | "side";

// The board is read-only here, so nothing can be dropped on it. GameBoard locks
// dragging when movableColor is null and never calls this, but the prop is
// required: a shared component that both screens use should not grow an
// optional callback to describe a board that cannot be touched.
const REJECT_DROP = () => false;

// Same sizing rule as the play screen: capped by whichever runs out first, the
// column's width or the viewport's height, so the board can never force a
// horizontal scrollbar.
const BOARD_SIZE = "min(100%, calc(100dvh - 14rem))";

// The coach view spends roughly seven more rem on the summary above the board,
// so its cap subtracts that much again. The board gets smaller on a short
// laptop screen rather than pushing the replay controls out of sight, which is
// the trade the coach view is worth: the controls are how you reach the moves
// the notes are talking about.
const COACH_BOARD_SIZE = "min(100%, calc(100dvh - 21rem))";

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

function countUserMoves(totalPlies: number, userColor: Side): number {
  return userColor === "white" ? Math.ceil(totalPlies / 2) : Math.floor(totalPlies / 2);
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

export function GameReplay({
  gameId,
  pgn,
  orientation,
  mode,
  meta,
  resultHeading,
  initialAnalyses,
  initialCommentary,
}: GameReplayProps) {
  const replay = useMemo(() => buildReplay(pgn), [pgn]);
  const [ply, setPly] = useState(0);

  // Held here rather than in the panels below, because the board and the move
  // list read them too: the arrows come from the analysis, and which layout to
  // render comes from the commentary. The panels that generate either of them
  // hand the results back up.
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [commentary, setCommentary] = useState(initialCommentary);

  const hasCommentary = commentary.summary !== null || commentary.moves.length > 0;
  const isCoachView = mode === "coach" && hasCommentary;

  // The coach view opens on the notes, because they are the reason the page is
  // laid out this way. Decided once, from what the server read: a game that
  // gains its commentary later gains it from this very panel, so the tab is
  // already the right one when the notes replace the generate button.
  const [tab, setTab] = useState<Tab>(isCoachView ? "side" : "moves");

  const lastPly = replay === null ? 0 : replay.fens.length - 1;

  // Arrow keys, per the wireframe's scrubber note. The slider handles its own
  // arrows, so a key pressed while it is focused is left alone rather than
  // moving twice. Up and down belong to the coach's notes and are not taken
  // here, so the two lists of keys do not collide.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") setPly((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setPly((current) => Math.min(lastPly, current + 1));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastPly]);

  // Named separately from `replay` so the memos below depend on the arrays
  // rather than on a nullable object, and so the null case has one exit.
  const moves = useMemo(() => replay?.moves ?? [], [replay]);
  const fens = useMemo(() => replay?.fens ?? [], [replay]);

  const notableMoves = useMemo(
    () => buildNotableDisplay(commentary.moves, analyses, fens, moves),
    [commentary.moves, analyses, fens, moves],
  );

  const fallbackMoves = useMemo(
    () => buildClassificationDisplay(analyses, fens, moves),
    [analyses, fens, moves],
  );

  // The user's analysed moves, by ply, for the arrows and the move list's marks.
  const analysisByPly = useMemo(() => {
    const byPly = new Map<number, StoredAnalysis>();
    for (const row of analyses) {
      if (row.is_user_move) byPly.set(row.ply, row);
    }
    return byPly;
  }, [analyses]);

  const classifications = useMemo(() => {
    const byIndex = new Map<number, Classification>();
    for (const row of analysisByPly.values()) byIndex.set(row.ply - 1, row.classification);
    return byIndex;
  }, [analysisByPly]);

  // Which note the board is standing in front of. Derived from the ply rather
  // than stored alongside it: the board showing the position a commented move
  // was played from IS what "viewing that note" means, so scrubbing onto it with
  // the slider opens the same note that clicking the note would have. One piece
  // of state, and the list can never disagree with the board.
  const notablePlies = useMemo(
    () => new Set(notableMoves.map((move) => move.ply)),
    [notableMoves],
  );
  const selectedPly = notablePlies.has(ply + 1) ? ply + 1 : null;

  // Arrows only for a notable position, and only in the coach view. Elsewhere a
  // bare analysis exists without any commentary to explain what the arrows mean.
  const arrows = useMemo(
    () =>
      isCoachView && selectedPly !== null
        ? buildMoveArrows(analysisByPly.get(selectedPly) ?? null)
        : [],
    [isCoachView, selectedPly, analysisByPly],
  );

  const selectedClassification =
    selectedPly === null ? undefined : analysisByPly.get(selectedPly)?.classification;
  const selectedArrowColor =
    selectedClassification === undefined ? null : playedArrowColor(selectedClassification);

  if (replay === null) {
    return (
      <p className="border border-ink bg-panel px-4 py-3 text-xs">
        This game&apos;s moves could not be read, so it cannot be replayed.
      </p>
    );
  }

  const atStart = ply === 0;
  const atEnd = ply === lastPly;
  const boardSize = isCoachView ? COACH_BOARD_SIZE : BOARD_SIZE;

  // A note is about a move, so selecting it puts the board in front of that
  // move rather than after it. Both arrows then start from the position the
  // player was actually looking at.
  function showNotable(notablePly: number) {
    setPly(notablePly - 1);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isCoachView && commentary.summary !== null ? (
        <section className="shrink-0 border-b border-dashed border-hairline px-4 py-4 md:px-6 md:py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Coach
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">{resultHeading}</h1>
          {/* Wider leading and a measure capped in characters, not pixels: this
              is the one paragraph on the page meant to be read rather than
              scanned, and it has to survive a 375px screen at the same size. */}
          <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed">{commentary.summary}</p>
        </section>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[1fr_340px]">
        <div className="flex min-h-0 flex-col gap-3 p-3 md:p-5">
          <div className="flex justify-center">
            <div className="aspect-square" style={{ width: boardSize }}>
              <GameBoard
                fen={replay.fens[ply]}
                orientation={orientation}
                movableColor={null}
                onDrop={REJECT_DROP}
                arrows={arrows}
              />
            </div>
          </div>

          <div
            className="mx-auto w-full border border-ink bg-panel p-3.5"
            style={{ maxWidth: boardSize }}
          >
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

            {/* Two arrows on a board need saying once. The played swatch takes
                its colour from the arrow it describes, so the legend cannot
                drift from what is drawn. */}
            {arrows.length > 0 && selectedArrowColor !== null ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-hairline pt-2.5 font-mono text-[10px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-[3px] w-4"
                    style={{ backgroundColor: selectedArrowColor }}
                  />
                  you played
                </span>
                {arrows.length > 1 ? (
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-[3px] w-4"
                      style={{ backgroundColor: ENGINE_ARROW_COLOR }}
                    />
                    engine preferred
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        <aside
          className={`flex min-h-0 flex-col border-t border-dashed border-hairline md:border-l md:border-t-0 ${
            isCoachView ? "min-h-[20rem] md:min-h-0" : ""
          }`}
        >
          <dl className="shrink-0 border-b border-dashed border-hairline px-4 py-3.5 font-mono text-[11px]">
            {meta.map((item) => (
              <div key={item.label} className="flex justify-between py-1">
                <dt className="text-muted">{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          {/* The notes and the move list share one column rather than stacking.
              340px of width can hold one scrolling list well and two badly, and
              both are lists of the same moves, so a tab reads as two ways of
              looking at the game rather than as something being hidden. */}
          <div className="flex shrink-0 border-b border-dashed border-hairline text-xs font-semibold">
            {isCoachView ? (
              <TabButton active={tab === "side"} onClick={() => setTab("side")}>
                Notes
              </TabButton>
            ) : null}
            <TabButton active={tab === "moves"} onClick={() => setTab("moves")}>
              Moves
            </TabButton>
            {isCoachView ? null : (
              <TabButton active={tab === "side"} onClick={() => setTab("side")}>
                {mode === "coach" ? "Coach" : "Analysis"}
              </TabButton>
            )}
          </div>

          {/* Both panels fill the same slot; the inactive one is hidden rather
              than unmounted, so an analysis in progress keeps running and its
              results survive a switch to the move list and back. activeIndex on
              the move list is the move that produced the position on the board,
              so it trails the ply by one and is -1 at the starting position. */}
          <div className={`flex min-h-0 flex-1 flex-col ${tab === "moves" ? "" : "hidden"}`}>
            <MoveHistory
              moves={replay.moves}
              activeIndex={ply - 1}
              onSelect={(index) => setPly(index + 1)}
              classifications={classifications}
            />
          </div>
          <div className={`flex min-h-0 flex-1 flex-col ${tab === "side" ? "" : "hidden"}`}>
            {isCoachView ? (
              <CoachView
                notableMoves={notableMoves}
                selectedPly={selectedPly}
                onSelect={showNotable}
              />
            ) : mode === "coach" ? (
              <CoachPanel
                gameId={gameId}
                pgn={pgn}
                userColor={orientation}
                analyses={analyses}
                fallbackMoves={fallbackMoves}
                totalUserMoves={countUserMoves(replay.moves.length, orientation)}
                onAnalyses={setAnalyses}
                onCommentary={setCommentary}
                onSelectPly={setPly}
              />
            ) : (
              <GameAnalysis
                gameId={gameId}
                pgn={pgn}
                userColor={orientation}
                initialAnalyses={analyses}
                fens={replay.fens}
                sanByPly={replay.moves}
                onAnalyses={setAnalyses}
                onSelectPly={setPly}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 ${active ? "bg-ink text-panel" : "text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
