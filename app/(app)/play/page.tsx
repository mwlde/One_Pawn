"use client";

import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { useEngineContext } from "@/components/EngineProvider";
import { useSessionUserId } from "@/components/SessionProvider";
import { GameBoard } from "@/components/board/GameBoard";
import { PlayerStrip } from "@/components/board/PlayerStrip";
import { EvalBar } from "@/components/panels/EvalBar";
import { MobileDrawer } from "@/components/panels/MobileDrawer";
import { MoveHistory } from "@/components/panels/MoveHistory";
import { Button } from "@/components/ui/Button";
import { useHideMobileNav } from "@/components/ui/TopNav";
import { parseEngineMove } from "@/lib/game/engine-move";
import { formatBalance, materialBalance } from "@/lib/game/evaluation";
import {
  describeEnd,
  describeResignation,
  describeTimeout,
  type GameEnd,
} from "@/lib/game/result";
import { buildSavePayload, saveGame, type SaveGamePayload, type SaveState } from "@/lib/game/save";
import {
  DEFAULT_SETTINGS,
  DIFFICULTY_LABELS,
  depthFor,
  fromChessColor,
  opposite,
  TIME_CONTROLS,
  toChessColor,
  type GameSettings,
  type Side,
} from "@/lib/game/settings";

import { GameSetup } from "./GameSetup";
import { PostGame } from "./PostGame";
import { ResignButton } from "./ResignButton";
import { useGameClock } from "./useGameClock";

type Phase = "setup" | "playing" | "over";

// Everything the UI needs from chess.js, pulled out after each move. chess.js
// mutates in place, so the instance itself can never be React state: the
// snapshot is what tells React something changed.
type Snapshot = {
  fen: string;
  turn: Side;
  moves: string[];
  balance: number;
};

function snapshotOf(chess: Chess): Snapshot {
  return {
    fen: chess.fen(),
    turn: fromChessColor(chess.turn()),
    moves: chess.history(),
    balance: materialBalance(chess),
  };
}

// Keeps the board square without measuring anything. min() means the board is
// capped by whichever runs out first, the column's width or the viewport's
// height, so it can never force a horizontal scrollbar. The 16rem is the
// chrome above and below it: nav, player strips, padding and gaps.
const BOARD_SIZE = "min(100%, calc(100dvh - 16rem))";

function describeLastMove(moves: string[]): string {
  if (moves.length === 0) return "no moves yet";
  const moveNumber = Math.ceil(moves.length / 2);
  const separator = moves.length % 2 === 1 ? "." : "...";
  return `${moveNumber}${separator} ${moves[moves.length - 1]}`;
}

export default function PlayPage() {
  const { isReady, getBestMove } = useEngineContext();
  const userId = useSessionUserId();

  const chessRef = useRef(new Chess());
  const [phase, setPhase] = useState<Phase>("setup");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => snapshotOf(new Chess()));
  const [end, setEnd] = useState<GameEnd | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  // The finished game, frozen. Held apart from the live board so a retry sends
  // the game that ended rather than whatever a rematch has since played.
  const [savePayload, setSavePayload] = useState<SaveGamePayload | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  // Bumped whenever the game the engine was asked about stops being the game on
  // the board. A search already in flight cannot be cancelled (see
  // docs/ARCHITECTURE.md, "Web Worker and WASM boundary"), so its answer is
  // matched against this and dropped if it belongs to a game that has ended.
  const generationRef = useRef(0);
  const thinkingRef = useRef(false);

  const engineSide = opposite(settings.side);
  const engineDepth = depthFor(settings.difficulty);
  const timeControl = TIME_CONTROLS[settings.timeControl];
  // A failed engine call stops the clocks too. Letting them run would flag the
  // engine and hand the player a win it did not earn.
  const running = phase === "playing" && engineError === null;

  const finishGame = useCallback(
    (result: GameEnd) => {
      generationRef.current += 1;
      setEnd(result);

      // Resigning is now reachable on move zero, and the save route rejects a
      // zero move count by design. An empty game is simply not offered to it
      // rather than being sent to fail: nothing was played, so nothing is saved.
      const played = chessRef.current.history().length > 0;
      setSavePayload(played ? buildSavePayload(chessRef.current, settings, result) : null);
      // Set here rather than in the effect that follows: React forbids a
      // synchronous setState from an effect body, and this is the last event
      // handler in the chain, so the indicator is already right on first paint.
      setSaveState(userId === null || !played ? { status: "idle" } : { status: "saving" });
      setPhase("over");
    },
    [settings, userId],
  );

  const handleFlag = useCallback(
    (flagged: Side) => {
      finishGame(describeTimeout(flagged, settings.side));
    },
    [finishGame, settings.side],
  );

  const handleResign = useCallback(() => {
    finishGame(describeResignation(settings.side));
  }, [finishGame, settings.side]);

  const clock = useGameClock({ running, sideToMove: snapshot.turn, onFlag: handleFlag });
  const { reset: resetClock, commitMove } = clock;

  useHideMobileNav(phase !== "setup");

  const startGame = useCallback(
    (next: GameSettings) => {
      generationRef.current += 1;
      thinkingRef.current = false;
      chessRef.current = new Chess();
      setSettings(next);
      setSnapshot(snapshotOf(chessRef.current));
      setEnd(null);
      setEngineError(null);
      setSavePayload(null);
      setSaveState({ status: "idle" });
      resetClock(TIME_CONTROLS[next.timeControl].baseSeconds);
      setPhase("playing");
    },
    [resetClock],
  );

  const retrySave = useCallback((payload: SaveGamePayload) => {
    setSaveState({ status: "saving" });
    void saveGame(payload).then(setSaveState);
  }, []);

  // Fires once per finished game: savePayload is a fresh object per ending and
  // userId does not change during one, so nothing else in this component can
  // re-trigger it. A save that failed stays failed until Retry asks again.
  //
  // The result is applied from the promise's callback rather than awaited in the
  // body, which is the same shape the engine effect above uses and the only one
  // React allows an effect to set state from.
  useEffect(() => {
    if (savePayload === null) return;
    if (userId === null) return;
    void saveGame(savePayload).then(setSaveState);
  }, [savePayload, userId]);

  // Shared tail of both sides' moves: stop the mover's clock, publish the new
  // position, and check whether that move ended the game.
  const advance = useCallback(
    (mover: Side) => {
      commitMove(mover, TIME_CONTROLS[settings.timeControl].incrementSeconds);
      setSnapshot(snapshotOf(chessRef.current));

      const result = describeEnd(chessRef.current, settings.side);
      if (result !== null) finishGame(result);
    },
    [commitMove, finishGame, settings.side, settings.timeControl],
  );

  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      if (phase !== "playing") return false;

      const chess = chessRef.current;
      if (chess.turn() !== toChessColor(settings.side)) return false;

      try {
        // Auto-promotes to a queen. react-chessboard has no promotion picker,
        // and the wireframe's settings panel defaults to Queen anyway; the
        // choice becomes a setting when that panel is built.
        chess.move({ from, to, promotion: "q" });
      } catch {
        // chess.js throws on an illegal move. Returning false snaps the piece
        // back to where it came from.
        return false;
      }

      advance(settings.side);
      return true;
    },
    [advance, phase, settings.side],
  );

  useEffect(() => {
    if (!running) return;
    if (snapshot.turn !== engineSide) return;
    if (thinkingRef.current) return;

    const chess = chessRef.current;
    if (chess.isGameOver()) return;

    thinkingRef.current = true;
    const generation = generationRef.current;

    getBestMove(chess.fen(), engineDepth)
      .then((uci) => {
        if (generation !== generationRef.current) return;
        // The turn check catches the case the generation counter cannot: a
        // reply arriving for a position that has already been played past.
        if (chess.turn() !== toChessColor(engineSide)) return;

        const parsed = parseEngineMove(uci);
        if (parsed === null) {
          setEngineError(`The engine returned a move that could not be read: ${uci}`);
          return;
        }

        try {
          chess.move(parsed);
        } catch {
          setEngineError(`The engine returned a move the position does not allow: ${uci}`);
          return;
        }

        advance(engineSide);
      })
      .catch((cause: unknown) => {
        if (generation !== generationRef.current) return;
        setEngineError(cause instanceof Error ? cause.message : "The engine failed to reply.");
      })
      .finally(() => {
        // Only the search belonging to the current game may clear the flag. A
        // stale one clearing it would let a second search start alongside the
        // one already running for the new game.
        if (generation === generationRef.current) thinkingRef.current = false;
      });
  }, [advance, engineDepth, engineSide, getBestMove, running, snapshot.turn]);

  if (phase === "setup") {
    return <GameSetup initialSettings={settings} onStart={startGame} />;
  }

  const moveCount = Math.ceil(snapshot.moves.length / 2);
  const playerToMove = snapshot.turn === settings.side;
  const historyPanel = <MoveHistory moves={snapshot.moves} />;
  const gameActions = (
    <div className="flex items-center gap-2">
      {phase === "playing" ? <ResignButton onResign={handleResign} /> : null}
      <Button className="flex-1" onClick={() => setPhase("setup")}>
        New game
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[1fr_340px]">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile takes an in-context header instead of the app nav, so a tab
            cannot be tapped by accident during a game. Wireframe 02m. */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-dashed border-hairline px-4 text-xs md:hidden">
          <button type="button" onClick={() => setPhase("setup")} className="text-muted">
            &larr; Leave
          </button>
          <span className="font-mono text-[11px] text-muted">
            {isReady ? timeControl.label : "Engine loading..."}
          </span>
          <span className="font-mono text-[11px] text-muted">
            {DIFFICULTY_LABELS[settings.difficulty]}
          </span>
        </div>

        {/* Desktop keeps the app nav, so the game's own context sits here as a
            slim row rather than in the shared top bar. */}
        <div className="hidden shrink-0 items-center gap-2 px-5 pt-4 font-mono text-[11px] text-muted md:flex">
          <span className="border border-ink px-2 py-1">{timeControl.label}</span>
          <span className="border border-ink bg-panel px-2 py-1">
            difficulty · {DIFFICULTY_LABELS[settings.difficulty]} · depth {engineDepth}
          </span>
        </div>

        {/* On mobile the board is capped by the viewport's width, so there is
            height to spare. Centring the strips and the board as one group
            keeps them together rather than stranding the clocks at opposite
            ends of the screen. Desktop has the opposite problem and lets the
            board row take all the slack instead. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 p-2 md:justify-normal md:gap-3 md:px-5 md:pb-5 md:pt-3">
          <PlayerStrip
            variant="opponent"
            name={`Engine (depth ${engineDepth})`}
            detail={
              running && !playerToMove
                ? "thinking..."
                : DIFFICULTY_LABELS[settings.difficulty]
            }
            clockMs={clock.clocks[engineSide]}
            active={running && !playerToMove}
          />

          <div className="flex min-h-0 items-center justify-center md:flex-1">
            <div className="flex items-stretch gap-3" style={{ width: BOARD_SIZE }}>
              {/* Glued to the board's left edge, never its own panel. Dropped
                  on mobile, where the number moves onto the player strip. */}
              <div className="hidden md:flex">
                <EvalBar balance={snapshot.balance} orientation={settings.side} />
              </div>
              <div className="aspect-square flex-1">
                <GameBoard
                  fen={snapshot.fen}
                  orientation={settings.side}
                  movableColor={running && playerToMove ? toChessColor(settings.side) : null}
                  onDrop={handleDrop}
                />
              </div>
            </div>
          </div>

          <PlayerStrip
            variant="self"
            name="You"
            detail={`eval ${formatBalance(snapshot.balance)}`}
            clockMs={clock.clocks[settings.side]}
            active={running && playerToMove}
          />
        </div>

        <MobileDrawer summary={describeLastMove(snapshot.moves)}>
          {historyPanel}
          <div className="shrink-0 border-t border-dashed border-hairline p-3">
            {gameActions}
          </div>
        </MobileDrawer>
      </div>

      <aside className="hidden min-h-0 border-l border-dashed border-hairline md:flex md:flex-col">
        {/* One tab for now. Chat and Settings are later phases. */}
        <div className="shrink-0 border-b border-dashed border-hairline px-4 py-3.5 text-center text-xs font-semibold">
          Moves
        </div>
        {historyPanel}
        {engineError === null ? null : (
          <p className="shrink-0 border-t border-ink bg-tint px-4 py-3 text-[11px] leading-relaxed">
            {engineError}
          </p>
        )}
        <div className="shrink-0 border-t border-dashed border-hairline p-3.5">
          {gameActions}
        </div>
      </aside>

      {phase === "over" && end !== null ? (
        <PostGame
          end={end}
          moveCount={moveCount}
          saveState={saveState}
          isLoggedIn={userId !== null}
          onRetrySave={savePayload === null ? null : () => retrySave(savePayload)}
          onRematch={() => startGame({ ...settings, side: opposite(settings.side) })}
          onNewGame={() => setPhase("setup")}
        />
      ) : null}
    </div>
  );
}
