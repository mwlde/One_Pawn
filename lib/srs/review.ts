// One graded review on its way to srs_state. The Reinforce counterpart of
// lib/lessons/progress.ts, and shaped the same way: the review screen holds
// state, this holds the grades, the payload and the transport.

import type { Quality } from "./sm2";

export type Grade = "forgot" | "struggled" | "easy";

// Three buttons named for how the review felt, each standing for one point on
// SM-2's 0 to 5 scale. 1 fails the review and resets the interval, 3 passes it
// at an ease cost, 5 passes it and makes the lesson easier. The other three
// qualities are not offered: a user cannot tell 0 from 1 or 4 from 5 reliably.
export const GRADES: readonly { grade: Grade; label: string; quality: Quality }[] = [
  { grade: "forgot", label: "Forgot", quality: 1 },
  { grade: "struggled", label: "Struggled", quality: 3 },
  { grade: "easy", label: "Easy", quality: 5 },
];

export type ReviewPayload = {
  lesson_id: string;
  quality: Quality;
};

export type ReviewErrorKind =
  | "not_authenticated"
  | "email_not_verified"
  | "not_in_queue"
  | "invalid_review_data"
  | "save_failed"
  | "network";

export type ReviewSubmitResult =
  | { status: "saved"; nextReviewAt: string | null }
  | { status: "error"; error: ReviewErrorKind };

const ERROR_KINDS: readonly ReviewErrorKind[] = [
  "not_authenticated",
  "email_not_verified",
  "not_in_queue",
  "invalid_review_data",
  "save_failed",
  "network",
];

export function readReviewErrorKind(body: unknown): ReviewErrorKind {
  if (typeof body !== "object" || body === null) return "save_failed";
  if (!("error" in body)) return "save_failed";
  const error = (body as { error: unknown }).error;
  return ERROR_KINDS.find((kind) => kind === error) ?? "save_failed";
}

// The success body is { reviewed: true, next_review_at }. Anything else is not
// a success, whatever the status code said.
export function readReviewed(body: unknown): { reviewed: boolean; nextReviewAt: string | null } {
  if (typeof body !== "object" || body === null || !("reviewed" in body)) {
    return { reviewed: false, nextReviewAt: null };
  }
  const { reviewed, next_review_at } = body as { reviewed: unknown; next_review_at?: unknown };
  return {
    reviewed: reviewed === true,
    nextReviewAt: typeof next_review_at === "string" ? next_review_at : null,
  };
}

export async function submitReview(payload: ReviewPayload): Promise<ReviewSubmitResult> {
  let response: Response;
  try {
    response = await fetch("/api/reinforce/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "error", error: "network" };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return { status: "error", error: readReviewErrorKind(body) };
  }

  const { reviewed, nextReviewAt } = readReviewed(body);
  return reviewed ? { status: "saved", nextReviewAt } : { status: "error", error: "save_failed" };
}
