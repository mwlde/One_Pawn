import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  countCompleted,
  lessonStatus,
  readCompletions,
  type LessonStatus,
} from "@/lib/lessons/completions";
import { loadTrackLessons } from "@/lib/lessons/load";
import { isTrack, TRACK_INFO } from "@/lib/lessons/tracks";
import type { Lesson, Track } from "@/lib/lessons/types";
import { createClient } from "@/lib/supabase/server";

import { ProgressBar } from "../ProgressBar";
import { ProgressNotice } from "../ProgressNotice";

export const metadata: Metadata = {
  title: "Learn · One Pawn",
};

// Wireframe 05 puts accuracy in this column. Accuracy is not stored, so the
// column says what is: whether the lesson is done, and whether without hints.
const STATUS_LABEL: Record<LessonStatus, string> = {
  not_started: "Not started",
  completed: "Completed",
  completed_no_hints: "Completed · no hints",
};

const STATUS_CLASS: Record<LessonStatus, string> = {
  not_started: "text-muted",
  completed: "text-graphite",
  completed_no_hints: "text-ink",
};

function LessonRow({ track, lesson, status }: { track: Track; lesson: Lesson; status: LessonStatus }) {
  const done = status !== "not_started";

  return (
    <li className="border-b border-rule">
      <Link
        href={`/learn/${track}/${lesson.id}`}
        className="flex items-center gap-3 px-1 py-3 transition-colors hover:bg-surface-sunk md:px-3"
      >
        {done ? (
          <span
            aria-hidden
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ink text-xs text-surface"
          >
            ✓
          </span>
        ) : (
          <span
            aria-hidden
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-rule-strong font-mono text-xs text-graphite"
          >
            {lesson.order}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className={`text-sm ${done ? "text-graphite line-through" : "font-medium"}`}>
            {lesson.title}
          </div>
          <div className="font-mono text-xs text-graphite">{lesson.steps.length} steps</div>
        </div>

        <span className={`shrink-0 text-right text-xs ${STATUS_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </Link>
    </li>
  );
}

// No lesson is invented to fill the space.
function EmptyTrack() {
  return (
    <div className="flex flex-col items-center gap-3 rounded border border-dashed border-rule-strong px-6 py-12 text-center">
      <p className="font-display text-xl font-medium">This track is being built.</p>
      <p className="text-xs text-graphite">Check back soon.</p>
    </div>
  );
}

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isTrack(track)) notFound();

  const { title, description } = TRACK_INFO[track];
  const lessons = loadTrackLessons(track);

  const supabase = await createClient();
  const progress = await readCompletions(supabase);
  const completions = progress.status === "known" ? progress.completions : new Map<string, boolean>();
  const done = countCompleted(completions, lessons);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6 md:px-8 md:py-8">
      <Link href="/learn" className="self-start text-xs text-graphite transition-colors hover:text-ink">
        All tracks
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">{title}</h1>
      <p className="mt-1 text-sm text-graphite">{description}</p>
      <div className="mt-1 font-mono text-xs text-graphite">
        {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
      </div>

      {progress.status === "known" && lessons.length > 0 ? (
        <div className="mt-3">
          <ProgressBar done={done} total={lessons.length} />
          <div className="mt-2 font-mono text-xs text-graphite">
            {done} / {lessons.length} complete
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <ProgressNotice progress={progress} />
      </div>

      <div className="mt-6">
        {lessons.length === 0 ? (
          <EmptyTrack />
        ) : (
          <ul className="border-t border-rule">
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                track={track}
                lesson={lesson}
                status={lessonStatus(completions, lesson.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
