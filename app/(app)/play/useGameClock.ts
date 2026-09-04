"use client";

import { useCallback, useEffect, useState } from "react";

import { applyIncrement, deduct, initialClocks, type Clocks } from "@/lib/game/clock";
import type { Side } from "@/lib/game/settings";

// How often the display refreshes. It has no bearing on accuracy: the clock is
// derived from wall-clock timestamps, not from counting ticks, so a delayed or
// dropped interval costs nothing. It only decides how soon a flag is noticed.
const TICK_MS = 100;

type ClockState = {
  // Time each side had left when the current turn began.
  committed: Clocks;
  turnStartedAt: number;
};

type UseGameClockArgs = {
  running: boolean;
  sideToMove: Side;
  onFlag: (flagged: Side) => void;
};

type GameClock = {
  clocks: Clocks;
  // Both sides back to the starting time, current side's turn begins now.
  reset: (baseSeconds: number) => void;
  // Charge the mover for the time they just used, then pay their increment.
  commitMove: (mover: Side, incrementSeconds: number) => void;
};

export function useGameClock({ running, sideToMove, onFlag }: UseGameClockArgs): GameClock {
  const [state, setState] = useState<ClockState>({
    committed: initialClocks(0),
    turnStartedAt: 0,
  });
  // The current time, refreshed by the interval. Held in state rather than read
  // from Date.now() during render, so a render is never a function of the wall
  // clock.
  const [now, setNow] = useState(0);

  const reset = useCallback((baseSeconds: number) => {
    const startedAt = Date.now();
    setState({ committed: initialClocks(baseSeconds), turnStartedAt: startedAt });
    setNow(startedAt);
  }, []);

  const commitMove = useCallback((mover: Side, incrementSeconds: number) => {
    const moveEndedAt = Date.now();
    setState((current) => {
      const elapsed = Math.max(0, moveEndedAt - current.turnStartedAt);
      const charged = deduct(current.committed, mover, elapsed);
      return {
        committed: applyIncrement(charged, mover, incrementSeconds),
        turnStartedAt: moveEndedAt,
      };
    });
    setNow(moveEndedAt);
  }, []);

  useEffect(() => {
    if (!running) return;

    const interval = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);

      const remaining = state.committed[sideToMove] - (tick - state.turnStartedAt);
      if (remaining > 0) return;

      // Stop immediately rather than waiting for the next render to tear the
      // interval down, so a flag cannot be reported twice.
      window.clearInterval(interval);
      // Pin the flagged clock to zero, so the post-game screen and the strip
      // behind it both read 0:00.
      setState({ committed: { ...state.committed, [sideToMove]: 0 }, turnStartedAt: tick });
      onFlag(sideToMove);
    }, TICK_MS);

    // Restarting whenever the turn or the committed times change is harmless:
    // turnStartedAt is the authority for elapsed time, not the interval's own
    // cadence, so no time is lost across a restart.
    return () => window.clearInterval(interval);
  }, [running, sideToMove, onFlag, state]);

  const elapsed = running ? Math.max(0, now - state.turnStartedAt) : 0;

  return {
    clocks: running ? deduct(state.committed, sideToMove, elapsed) : state.committed,
    reset,
    commitMove,
  };
}
