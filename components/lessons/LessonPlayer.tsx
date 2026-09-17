"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { GameBoard } from "@/components/board/GameBoard";
import { Button } from "@/components/ui/Button";
import { judgeMove } from "@/lib/lessons/judge-move";
import type { Hint, Lesson } from "@/lib/lessons/types";

type LessonPlayerProps = {
  lesson: Lesson;
};

type Feedback =
  | { tone: "explanation"; text: string }
  // repeats counts identical errors in a row. Without it, a second identical
  // mistake replaces the text with the same text and looks like nothing happened.
  | { tone: "error"; text: string; repeats: number };

// One object for the whole run, created by one function. Restart calls the
// same function, so a reset cannot forget a field.
//
// The position is a FEN string rather than a chess.js instance. A wrong move
// never changes the board, so the only positions a step shows are its own FEN
// and the one after a correct move. judgeMove builds chess.js from the step
// when it needs it, and nothing mutable has to be kept in sync with the render.
type Run = {
  stepIndex: number;
  fen: string;
  hintsShown: number;
  stepDone: boolean;
  feedback: Feedback | null;
  // The lesson's total, which is what LessonCompletion stores.
  mistakes: number;
  // Sticky: one hint on any step makes the run not perfect.
  usedHints: boolean;
  finished: boolean;
};

function startRun(lesson: Lesson): Run {
  return {
    stepIndex: 0,
    fen: lesson.steps[0].fen,
    hintsShown: 0,
    stepDone: false,
    feedback: null,
    mistakes: 0,
    usedHints: false,
    finished: false,
  };
}

const ILLEGAL_MOVE = "That move is not legal here. Try again.";
const WRONG_MOVE = "That move is legal, but it is not what this step asks for. Try again.";
// For any other move on an attempt step, legal or not. "Not legal" would be
// true but unhelpful there, since the move the step wants is not legal either.
const WRONG_ATTEMPT = "Not that move. This step asks you to try the move in the instruction.";

// Same sizing rule as the play and replay screens, so the board never forces a
// horizontal scrollbar.
const BOARD_SIZE = "min(100%, calc(100dvh - 14rem))";

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  const [run, setRun] = useState<Run>(() => startRun(lesson));

  const step = lesson.steps[run.stepIndex];
  // Attempt steps may have no hints; an empty list hides the button.
  const hints: readonly Hint[] = step.hints ?? [];
  const isLastStep = run.stepIndex === lesson.steps.length - 1;

  // By default the first step's side to move sets the orientation for the whole
  // lesson: flipping the board between steps just because the side to move
  // changed would be more disorienting than any one position is worth. A step
  // that really wants the other side says so explicitly.
  const lessonOrientation = lesson.steps[0].fen.split(" ")[1] === "b" ? "black" : "white";
  const orientation = step.orientation ?? lessonOrientation;
  const sideToMove = step.fen.split(" ")[1] === "b" ? "b" : "w";

  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      if (run.stepDone) return false;

      const verdict = judgeMove(step, from, to);
      switch (verdict.result) {
        case "none":
          return false;
        case "correct":
          setRun((current) => ({
            ...current,
            fen: verdict.fen,
            stepDone: true,
            feedback: { tone: "explanation", text: step.explanation },
          }));
          return true;
        case "attempted":
          // The piece snaps back, which is the lesson: the move does not exist.
          setRun((current) => ({
            ...current,
            stepDone: true,
            feedback: { tone: "explanation", text: step.explanation },
          }));
          return false;
        case "illegal":
        case "wrong": {
          const text =
            step.kind === "attempt" ? WRONG_ATTEMPT : verdict.result === "illegal" ? ILLEGAL_MOVE : WRONG_MOVE;
          setRun((current) => {
            const previous = current.feedback;
            const repeats =
              previous?.tone === "error" && previous.text === text ? previous.repeats + 1 : 1;
            return {
              ...current,
              mistakes: current.mistakes + 1,
              feedback: { tone: "error", text, repeats },
            };
          });
          return false;
        }
      }
    },
    [run.stepDone, step],
  );

  function showHint() {
    // Clears the last error: left below a new hint, it reads as a verdict on
    // the hint rather than on the move before it.
    setRun((current) => ({
      ...current,
      hintsShown: current.hintsShown + 1,
      usedHints: true,
      feedback: null,
    }));
  }

  function next() {
    if (isLastStep) {
      setRun((current) => ({ ...current, finished: true }));
      return;
    }

    const nextIndex = run.stepIndex + 1;
    setRun((current) => ({
      ...current,
      stepIndex: nextIndex,
      // Always the next step's own FEN, even when it matches the board: every
      // step is self-contained, per the schema.
      fen: lesson.steps[nextIndex].fen,
      hintsShown: 0,
      stepDone: false,
      feedback: null,
    }));
  }

  if (run.finished) {
    return (
      <LessonComplete
        title={lesson.title}
        mistakes={run.mistakes}
        usedHints={run.usedHints}
        onRestart={() => setRun(startRun(lesson))}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-dashed border-hairline px-4 py-3 md:px-6">
        <h1 className="text-sm font-semibold">{lesson.title}</h1>
        <span className="font-mono text-[11px] text-muted">
          Step {run.stepIndex + 1} of {lesson.steps.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[1fr_340px]">
        <div className="flex justify-center p-3 md:p-5">
          <div className="aspect-square" style={{ width: BOARD_SIZE }}>
            <GameBoard
              fen={run.fen}
              orientation={orientation}
              movableColor={run.stepDone ? null : sideToMove}
              onDrop={handleDrop}
            />
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-5 border-t border-dashed border-hairline px-4 py-5 md:border-l md:border-t-0">
          <p className="text-[15px] leading-relaxed">{step.instruction}</p>

          {hints.length > 0 && (
            <div className="flex flex-col gap-2">
              {hints.slice(0, run.hintsShown).map((hint, index) => (
                <div key={index} className="border border-dashed border-hairline bg-panel px-3 py-2.5">
                  <span className="mb-1 block font-mono text-[10px] uppercase text-muted">
                    {hint.level}
                  </span>
                  <p className="text-[13px] leading-relaxed">{hint.text}</p>
                </div>
              ))}
              {!run.stepDone && run.hintsShown < hints.length && (
                <Button type="button" onClick={showHint} className="self-start">
                  {run.hintsShown === 0 ? "Show hint" : "Show more"}
                </Button>
              )}
            </div>
          )}

          {/* Polite, so a screen reader reads the verdict after the drop
              without cutting off anything already being spoken. */}
          <div aria-live="polite">
            {run.feedback !== null && (
              <p
                className={
                  run.feedback.tone === "explanation"
                    ? "border border-ink bg-panel px-3.5 py-3 text-[13px] leading-relaxed"
                    : "font-mono text-[11px] text-muted"
                }
              >
                {run.feedback.text}
                {run.feedback.tone === "error" && run.feedback.repeats > 1 && (
                  <span className="ml-1.5 text-ink">×{run.feedback.repeats}</span>
                )}
              </p>
            )}
          </div>

          {run.stepDone && (
            <Button type="button" variant="primary" onClick={next} className="mt-auto self-stretch">
              {isLastStep ? "Finish" : "Next"}
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}

type LessonCompleteProps = {
  title: string;
  mistakes: number;
  usedHints: boolean;
  onRestart: () => void;
};

// Facts about the run and two ways out. No praise: the numbers say how it went.
function LessonComplete({ title, mistakes, usedHints, onRestart }: LessonCompleteProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm border border-ink bg-panel p-6">
        <p className="font-mono text-[11px] text-muted">{title}</p>
        <h1 className="mt-1 text-lg font-semibold">Lesson complete.</h1>

        <dl className="mt-5 border-t border-dashed border-hairline pt-3 font-mono text-[11px]">
          <div className="flex justify-between py-1">
            <dt className="text-muted">mistakes</dt>
            <dd>{mistakes}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted">hints used</dt>
            <dd>{usedHints ? "yes" : "no"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          {/* /learn does not exist until Learn navigation lands; a 404 is
              expected for now. */}
          <Link
            href="/learn"
            className="border border-ink bg-ink px-5 py-3.5 text-center text-sm font-semibold leading-none text-panel transition-colors hover:bg-black"
          >
            Back to lessons
          </Link>
          <Button type="button" onClick={onRestart}>
            Restart lesson
          </Button>
        </div>
      </div>
    </div>
  );
}
