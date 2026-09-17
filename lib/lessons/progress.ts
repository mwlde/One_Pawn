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
  // "<step id>:<from><to>" per wrong move, in play order. Optional in the
  // schema only so a tab opened before this field existed can still save.
  wrong_moves: string[];
};

// Whether this completion put the lesson in the review queue. Mirrors the
// strings record_lesson_completion() returns.
export type GraduationStatus = "graduated_now" | "not_graduated" | "already_graduated";

export type ProgressErrorKind =
  | "not_authenticated"
  | "email_not_verified"
  | "invalid_progress_data"
  | "save_failed"
  | "network";

export type ProgressSaveState =
  | { status: "idle" }
  | { status: "saving" }
  // graduation is null when the route could not say, which the completion
  // screen shows as a plain save.
  | { status: "saved"; graduation: GraduationStatus | null }
  | { status: "error"; error: ProgressErrorKind };

const GRADUATION_STATUSES: readonly GraduationStatus[] = ["graduated_now", "not_graduated", "already_graduated"];

const ERROR_KINDS: readonly ProgressErrorKind[] = [
  "not_authenticated",
  "email_not_verified",
  "invalid_progress_data",
  "save_failed",
  "network",
];

export type PlayerMode = "learn" | "review";

// What a finished run does. In Learn it is saved to user_progress, if there is
// anyone to save it for. In a review it is handed to the review screen, which
// grades it against srs_state instead: a review is not a new completion, and
// saving it would move completed_at and wrong_moves for a lesson the user did
// not replay from Learn.
export type FinishAction = "save" | "report" | "none";

export function finishAction(mode: PlayerMode, isLoggedIn: boolean): FinishAction {
  if (mode === "review") return "report";
  return isLoggedIn ? "save" : "none";
}

// Built once, when the lesson finishes, from plain values. Nothing in it points
// back at the player's state, so a retry after Restart still sends the run that
// finished, not the fresh one.
export function buildProgressPayload(
  lesson: Lesson,
  run: { mistakes: number; usedHints: boolean; wrongMoves: readonly string[] },
): SaveProgressPayload {
  return {
    lesson_id: lesson.id,
    used_hints: run.usedHints,
    mistake_count: run.mistakes,
    wrong_moves: [...run.wrongMoves],
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

export function isGraduationStatus(value: unknown): value is GraduationStatus {
  return GRADUATION_STATUSES.some((status) => status === value);
}

export function readGraduationStatus(body: unknown): GraduationStatus | null {
  if (typeof body !== "object" || body === null) return null;
  if (!("graduation_status" in body)) return null;
  const status = (body as { graduation_status: unknown }).graduation_status;
  return isGraduationStatus(status) ? status : null;
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

  return readSaved(body)
    ? { status: "saved", graduation: readGraduationStatus(body) }
    : { status: "error", error: "save_failed" };
}
