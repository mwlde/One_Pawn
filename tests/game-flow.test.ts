import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { applyIncrement, deduct, initialClocks, type Clocks } from "@/lib/game/clock";
import { parseEngineMove } from "@/lib/game/engine-move";
import { materialBalance } from "@/lib/game/evaluation";
import { describeEnd } from "@/lib/game/result";
import { fromChessColor, opposite, TIME_CONTROLS, type Side } from "@/lib/game/settings";

// The move loop the game screen runs, with the engine's replies supplied as a
// script instead of coming from WASM. The engine itself is a build artifact and
// is covered separately by engine/tests/wasm_smoke.mjs; what this exercises is
// the seam the game screen owns, which is everything between the engine's reply
// arriving and the result appearing on screen.
function playScriptedGame(engineReplies: string[], userMoves: string[], userSide: Side) {
  const chess = new Chess();
  const timeControl = TIME_CONTROLS["3+2"];
  let clocks: Clocks = initialClocks(timeControl.baseSeconds);
  let ended: ReturnType<typeof describeEnd> = null;
  let endedAfterPlies = 0;

  const engineSide = opposite(userSide);
  const remaining = { [userSide]: [...userMoves], [engineSide]: [...engineReplies] } as Record<Side, string[]>;

  while (ended === null) {
    const sideToMove = fromChessColor(chess.turn());
    const next = remaining[sideToMove].shift();
    if (next === undefined) break;

    if (sideToMove === engineSide) {
      const parsed = parseEngineMove(next);
      expect(parsed).not.toBeNull();
      chess.move(parsed!);
    } else {
      chess.move(next);
    }

    clocks = applyIncrement(deduct(clocks, sideToMove, 1_000), sideToMove, timeControl.incrementSeconds);
    ended = describeEnd(chess, userSide);
    endedAfterPlies = chess.history().length;
  }

  return { chess, clocks, ended, endedAfterPlies };
}

describe("a game played through to a result", () => {
  // Fool's mate, with the engine as White feeding its moves in the engine's own
  // notation and the user mating as Black.
  it("ends the moment checkmate appears, and not before", () => {
    const played: (string | null)[] = [];
    const chess = new Chess();
    for (const move of ["f2f3", "e7e5", "g2g4", "d8h4"]) {
      chess.move(parseEngineMove(move)!);
      played.push(describeEnd(chess, "black")?.reason ?? null);
    }

    expect(played).toEqual([null, null, null, "by checkmate"]);
  });

  it("reports the user's win when the user gives mate", () => {
    const { ended, chess } = playScriptedGame(["f2f3", "g2g4"], ["e5", "Qh4#"], "black");

    expect(chess.isCheckmate()).toBe(true);
    expect(ended).toMatchObject({
      outcome: "win",
      headline: "You won",
      reason: "by checkmate",
      winner: "black",
    });
  });

  it("reports the user's loss from the same game seen from the other side", () => {
    // The engine is Black this time, so its replies arrive in the engine's own
    // notation while the user's moves stay in SAN.
    const { ended } = playScriptedGame(["e7e5", "d8h4"], ["f3", "g4"], "white");

    expect(ended).toMatchObject({
      outcome: "loss",
      headline: "You lost",
      winner: "black",
    });
  });

  it("counts the plies it took", () => {
    const { endedAfterPlies } = playScriptedGame(["f2f3", "g2g4"], ["e5", "Qh4#"], "black");
    expect(endedAfterPlies).toBe(4);
    expect(Math.ceil(endedAfterPlies / 2)).toBe(2);
  });

  it("charges both clocks and pays the increment on every move", () => {
    const { clocks } = playScriptedGame(["f2f3", "g2g4"], ["e5", "Qh4#"], "black");

    // Two moves each, one second used and two seconds credited per move.
    expect(clocks.white).toBe(180_000 + 2 * 1_000);
    expect(clocks.black).toBe(180_000 + 2 * 1_000);
  });

  it("tracks material as captures happen", () => {
    const { chess } = playScriptedGame(["e2e4", "e4d5"], ["d5", "Nf6"], "black");
    expect(materialBalance(chess)).toBe(1);
  });
});

describe("a game that runs out of moves without ending", () => {
  it("leaves the result unset while the position is still live", () => {
    const { ended, chess } = playScriptedGame(["e2e4", "g1f3"], ["e5", "Nc6"], "black");

    expect(chess.isGameOver()).toBe(false);
    expect(ended).toBeNull();
  });
});

describe("an unreadable engine reply", () => {
  // The game screen turns a null here into a visible error rather than letting
  // chess.js throw inside a promise callback.
  it("is caught before it reaches chess.js", () => {
    expect(parseEngineMove("")).toBeNull();
    expect(parseEngineMove("nonsense")).toBeNull();
  });
});
