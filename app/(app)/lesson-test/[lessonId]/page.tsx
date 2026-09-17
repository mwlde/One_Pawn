import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { loadLesson } from "@/lib/lessons/load";

// Temporary. Exists only to exercise the lesson player before Learn navigation
// is built, and is replaced by the real /learn routes in session 2D. Nothing
// links here.
export const metadata: Metadata = {
  title: "Lesson test · One Pawn",
  robots: { index: false },
};

export default async function LessonTestPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;

  // Loaded and validated on the server, so the player gets a checked Lesson
  // and zod never reaches the browser.
  const lesson = loadLesson(lessonId);
  if (lesson === null) notFound();

  return <LessonPlayer lesson={lesson} />;
}
