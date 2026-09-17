import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { loadLesson } from "@/lib/lessons/load";

export const metadata: Metadata = {
  title: "Lesson · One Pawn",
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ track: string; lesson: string }>;
}) {
  const { track, lesson: lessonId } = await params;

  // Loaded and validated on the server, so the player gets a checked Lesson
  // and zod never reaches the browser.
  const lesson = loadLesson(lessonId);

  // A real lesson under the wrong track is a 404 too, so each lesson has one
  // address rather than four.
  if (lesson === null || lesson.track !== track) notFound();

  return <LessonPlayer lesson={lesson} />;
}
