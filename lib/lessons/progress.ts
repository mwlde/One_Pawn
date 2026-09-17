// A finished lesson on its way to Supabase. The lesson counterpart of
// lib/game/save.ts, and shaped the same way on purpose: the player holds state,
// this holds the payload and the transport.

import type { Lesson } from "./types";

// Keys are snake_case because they are user_progress column names. user_id and
// completed_at are absent: the server takes the owner from the session and the
// time from its own clock, so neither is the client's to claim.
export type SaveProgressPayload = {
  lesson_id: string;
  used_hints: boolean;
  mistake_count: number;
};

export type ProgressErrorKind =
  | "not_authenticated"
  | "email_not_verified"
  | "invalid_progress_data"
  | "save_failed"
  | "network";

export type ProgressSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; error: ProgressErrorKind };

const ERROR_KINDS: readonly ProgressErrorKind[] = [
  "not_authenticated",
  "email_not_verified",
  "invalid_progress_data",
  "save_failed",
  "network",
];

// Built once, when the lesson finishes, from plain values. Nothing in it points
// back at the player's state, so a retry after Restart still sends the run that
// finished, not the fresh one.
export function buildProgressPayload(
  lesson: Lesson,
  run: { mistakes: number; usedHints: boolean },
): SaveProgressPayload {
  return {
    lesson_id: lesson.id,
    used_hints: run.usedHints,
    mistake_count: run.mistakes,
  };
}

// Anything unrecognised is save_failed: the generic "try again" case, rather
// than a message that claims to know what went wrong.
export function readProgressErrorKind(body: unknown): ProgressErrorKind {
  if (typeof body !== "object" || body === null) return "save_failed";
  if (!("error" in body)) return "save_failed";
  const error = (body as { error: unknown }).error;
  if (typeof error !== "string") return "save_failed";
  return ERROR_KINDS.find((kind) => kind === error) ?? "save_failed";
}

export function readSaved(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  if (!("saved" in body)) return false;
  return (body as { saved: unknown }).saved === true;
}

// Returns the state the save ended in rather than setting it, so the caller
// decides whether that state still applies when it arrives.
export async function saveProgress(payload: SaveProgressPayload): Promise<ProgressSaveState> {
  let response: Response;
  try {
    response = await fetch("/api/lessons/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "error", error: "network" };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return { status: "error", error: readProgressErrorKind(body) };
  }

  return readSaved(body) ? { status: "saved" } : { status: "error", error: "save_failed" };
}
