"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LessonPlayer, type RunResult } from "@/components/lessons/LessonPlayer";
import { Button } from "@/components/ui/Button";
import type { Lesson } from "@/lib/lessons/types";
import { formatDueIn } from "@/lib/srs/format";
import { GRADES, submitReview, type Grade, type ReviewErrorKind } from "@/lib/srs/review";
import type { Quality } from "@/lib/srs/sm2";

export type ReviewItem = {
  lesson: Lesson;
  // "reviewed 6 days ago · interval 6d", formatted on the server.
  context: string;
};

type ReviewSessionProps = {
  items: readonly ReviewItem[];
  // The earliest review among lessons that were not due when the session began.
  upcomingNextDueAt: string | null;
};

type Graded = {
  grade: Grade;
  nextReviewAt: string | null;
};

// playing: the lesson is on the board. grading: it is finished and waiting for
// a grade. graded: the grade is saved and the card says when the lesson comes
// back, before the session moves on. The session is over once every item has a
// result.
type Phase =
  | { kind: "playing" }
  | { kind: "grading"; run: RunResult; saving: Grade | null; error: ReviewErrorKind | null }
  | { kind: "graded"; run: RunResult; grade: Grade; nextReviewAt: string | null };

// Long enough to read one short line, short enough not to feel like a wait.
const GRADED_PAUSE_MS = 1800;

const NOTE = "mt-2 font-mono text-[10px] leading-relaxed text-muted";
const PRIMARY_LINK =
  "block border border-ink bg-ink px-5 py-3.5 text-center text-sm font-semibold leading-none text-panel transition-colors hover:bg-black";

export function ReviewSession({ items, upcomingNextDueAt }: ReviewSessionProps) {
  const [results, setResults] = useState<Graded[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "playing" });
  // Set synchronously on the first click. phase.saving also disables the
  // buttons, but only once React re-renders: a double-tap that lands before
  // then reads the old phase, and a second request would apply SM-2 again to
  // the row the first one already updated.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (phase.kind !== "graded") return;
    const { grade, nextReviewAt } = phase;
    const timer = setTimeout(() => {
      setResults((current) => [...current, { grade, nextReviewAt }]);
      setPhase({ kind: "playing" });
    }, GRADED_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // One result per graded lesson, in queue order, so the count of results is
  // also the index of the lesson in play.
  const index = results.length;

  if (index >= items.length) {
    return <SessionSummary results={results} upcomingNextDueAt={upcomingNextDueAt} />;
  }

  const item = items[index];

  async function grade(chosen: Grade, quality: Quality) {
    if (submittingRef.current || phase.kind !== "grading") return;
    submittingRef.current = true;
    const run = phase.run;
    setPhase({ kind: "grading", run, saving: chosen, error: null });

    const result = await submitReview({ lesson_id: item.lesson.id, quality });

    if (result.status === "error") {
      // The buttons come back, so choosing again is the retry.
      submittingRef.current = false;
      setPhase({ kind: "grading", run, saving: null, error: result.error });
      return;
    }

    // Not released here. The lock holds until the next lesson's grade card
    // opens, so nothing can reach this card while it is being swapped out.
    setPhase({ kind: "graded", run, grade: chosen, nextReviewAt: result.nextReviewAt });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SessionHeader position={index + 1} total={items.length} context={item.context} />

      {phase.kind === "playing" ? (
        // Keyed by position, so the next lesson starts from a fresh run even
        // when the same lesson could somehow appear twice.
        <LessonPlayer
          key={index}
          lesson={item.lesson}
          mode="review"
          onComplete={(run) => {
            submittingRef.current = false;
            setPhase({ kind: "grading", run, saving: null, error: null });
          }}
        />
      ) : (
        <GradeCard
          title={item.lesson.title}
          run={phase.run}
          saving={phase.kind === "grading" ? phase.saving : null}
          error={phase.kind === "grading" ? phase.error : null}
          saved={phase.kind === "graded" ? { nextReviewAt: phase.nextReviewAt } : null}
          onGrade={grade}
        />
      )}
    </div>
  );
}

// Wireframe 08's due indicator and context line, in the page rather than the
// top bar, which is the shared shell and knows nothing about a session. The
// bar fills as lessons are done.
function SessionHeader({ position, total, context }: { position: number; total: number; context: string }) {
  const done = position - 1;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-dashed border-hairline px-4 py-2.5 font-mono text-[11px] text-muted md:px-6">
      <Link href="/reinforce" className="hover:text-ink">
        ← quit
      </Link>
      <span className="hidden truncate sm:inline">{context}</span>
      <span className="flex items-center gap-3">
        <span>
          {position} of {total}
        </span>
        <span aria-hidden className="relative h-1 w-10 bg-hairline md:w-20">
          <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${(done / total) * 100}%` }} />
        </span>
      </span>
    </div>
  );
}

const ERROR_MESSAGES: Record<ReviewErrorKind, string> = {
  not_authenticated: "Session expired. Log in again, then come back to finish this review.",
  email_not_verified: "Email verification required. Open the link in your inbox, then choose again.",
  not_in_queue: "This lesson is no longer in your review queue.",
  invalid_review_data: "That review could not be saved. Choose again.",
  save_failed: "Save failed. Choose again to retry.",
  network: "No connection. Choose again to retry.",
};

// The lesson complete card from Learn, with the save line replaced by the
// grade. No grade is primary: the screen should not suggest an answer.
function GradeCard({
  title,
  run,
  saving,
  error,
  saved,
  onGrade,
}: {
  title: string;
  run: RunResult;
  saving: Grade | null;
  error: ReviewErrorKind | null;
  saved: { nextReviewAt: string | null } | null;
  onGrade: (grade: Grade, quality: Quality) => void;
}) {
  const locked = saving !== null || saved !== null;

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm border border-ink bg-panel p-6">
        <p className="font-mono text-[11px] text-muted">{title}</p>
        <h1 className="mt-1 text-lg font-semibold">How well did you remember it?</h1>

        <dl className="mt-5 border-t border-dashed border-hairline pt-3 font-mono text-[11px]">
          <div className="flex justify-between py-1">
            <dt className="text-muted">mistakes</dt>
            <dd>{run.mistakes}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-muted">hints used</dt>
            <dd>{run.usedHints ? "yes" : "no"}</dd>
          </div>
        </dl>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {GRADES.map(({ grade, label, quality }) => (
            <Button
              key={grade}
              type="button"
              disabled={locked}
              aria-disabled={locked}
              onClick={() => onGrade(grade, quality)}
              className="px-2"
            >
              {saving === grade ? "Saving..." : label}
            </Button>
          ))}
        </div>

        <div aria-live="polite">
          {error !== null ? (
            <p className={NOTE}>{ERROR_MESSAGES[error]}</p>
          ) : saved !== null ? (
            <p className={NOTE}>
              {saved.nextReviewAt === null
                ? "Saved."
                : `Saved. This lesson comes back ${formatDueIn(saved.nextReviewAt, new Date())}.`}
            </p>
          ) : (
            <p className={NOTE}>Your answer decides when this lesson comes back.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Wireframe 08b. The qualitative sentence is left out: nothing can write it
// honestly without the coach.
function SessionSummary({
  results,
  upcomingNextDueAt,
}: {
  results: readonly Graded[];
  upcomingNextDueAt: string | null;
}) {
  const counts = GRADES.map(({ grade, label }) => ({
    label: label.toLowerCase(),
    count: results.filter((result) => result.grade === grade).length,
  }));

  // The earliest date anything comes back: a lesson just graded, or one that
  // was not due today. Compared as times, not strings: Supabase writes the
  // offset as +00:00 and toISOString as Z, which do not sort together.
  const candidates = [upcomingNextDueAt, ...results.map((result) => result.nextReviewAt)].filter(
    (date): date is string => date !== null,
  );
  const nextReviewAt =
    candidates.length === 0
      ? null
      : candidates.reduce((a, b) => (new Date(a).getTime() <= new Date(b).getTime() ? a : b));

  return (
    <div className="flex flex-1 items-center justify-center p-4 md:p-12">
      <div className="w-full max-w-[560px] border border-ink bg-panel p-6 md:p-10">
        <div className="mb-3 font-mono text-[10px] tracking-[0.1em] text-muted">DONE FOR TODAY</div>
        <h1 className="mb-1.5 text-2xl font-semibold tracking-[-0.01em] md:text-3xl">
          {results.length} {results.length === 1 ? "lesson" : "lessons"} reviewed
        </h1>
        {nextReviewAt !== null ? (
          <p className="text-sm text-muted">Next review {formatDueIn(nextReviewAt, new Date())}.</p>
        ) : null}

        <p className="mt-6 border-t border-dashed border-hairline pt-5 font-mono text-[11px] text-muted">
          {counts.map(({ label, count }) => `${count} ${label}`).join(" · ")}
        </p>

        <Link href="/reinforce" className={`${PRIMARY_LINK} mt-7`}>
          Done
        </Link>
      </div>
    </div>
  );
}
