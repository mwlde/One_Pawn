import { describe, expect, it } from "vitest";

import { judgeMove } from "@/lib/lessons/judge-move";
import { loadLesson } from "@/lib/lessons/load";
import type { LessonStep, MoveStep } from "@/lib/lessons/types";

// The pawn lesson doubles as the fixture: it is the content the player ships
// with, so these cases break if the lesson and the judgement drift apart.
const lesson = loadLesson("pawn-movement");
if (lesson === null) throw new Error("pawn-movement lesson is missing");

function stepById(id: string): LessonStep {
  const step = lesson?.steps.find((candidate) => candidate.id === id);
  if (step === undefined) throw new Error(`no step "${id}"`);
  return step;
}

describe("judgeMove", () => {
  it("accepts any of several accepted moves and returns the new position", () => {
    const step = stepById("single-push");
    expect(judgeMove(step, "a2", "a3")).toEqual({
      result: "correct",
      fen: "rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR b KQkq - 0 1",
    });
    expect(judgeMove(step, "h2", "h3").result).toBe("correct");
  });

  it("calls a legal move outside acceptedMoves wrong", () => {
    expect(judgeMove(stepById("single-push"), "e2", "e4")).toEqual({ result: "wrong" });
    expect(judgeMove(stepById("diagonal-capture"), "e4", "e5")).toEqual({ result: "wrong" });
  });

  it("calls an illegal move on a move step illegal", () => {
    expect(judgeMove(stepById("single-push"), "e2", "e5")).toEqual({ result: "illegal" });
  });

  it("completes an attempt step only on the exact attempted squares", () => {
    const step = stepById("blocked-push");
    expect(judgeMove(step, "e4", "e5")).toEqual({ result: "attempted" });
    // Also illegal, but not the move the instruction asked for, so the
    // explanation about the blocked pawn does not fit it.
    expect(judgeMove(step, "e4", "e6")).toEqual({ result: "illegal" });
    expect(judgeMove(step, "b1", "b3")).toEqual({ result: "illegal" });
  });

  it("calls a legal move on an attempt step wrong", () => {
    expect(judgeMove(stepById("blocked-push"), "d2", "d4")).toEqual({ result: "wrong" });
  });

  it("ignores a piece put back on its own square", () => {
    expect(judgeMove(stepById("single-push"), "e2", "e2")).toEqual({ result: "none" });
    expect(judgeMove(stepById("blocked-push"), "e4", "e4")).toEqual({ result: "none" });
  });

  it("plays the opponent reply after a correct move", () => {
    const base = stepById("double-push") as MoveStep;
    const step: MoveStep = { ...base, opponentReply: "e7e5" };
    expect(judgeMove(step, "e2", "e4")).toEqual({
      result: "correct",
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    });
  });
});
