// Browser-side transport for a game's coach commentary: load what is stored, or
// ask the server to generate it. Kept apart from the prompt and selection logic
// so those stay free of fetch. Mirrors lib/analysis/client.ts.
//
// The Groq key and every LLM call live on the server. This module only ever
// talks to our own route, which is the whole point of the split.

import type { GameCommentary, StoredMoveCommentary } from "./types";

// Why a generation attempt produced no commentary. A flat boolean cannot tell a
// model that fell over from a request the route refused outright, and the two
// want different screens: one gets a Try again button, the other must not,
// because pressing it would spend another call to be told the same thing.
export type CommentaryFailure =
  // Groq could not produce a summary. The commonest failure and the one most
  // worth retrying: rate limits and timeouts both land here.
  | "groq"
  // The request never completed. Offline, or a dropped connection.
  | "network"
  // The analysis has to be saved before commentary can be written from it.
  | "not_analyzed"
  // Our own route failed on a read or a write.
  | "server"
  // Not this user's game, not a Coach-mode game, or no session. Retrying the
  // same request gets the same answer.
  | "refused"
  // The day's coach analyses are used up. Retrying now gets the same answer;
  // the slot comes back on its own, so the screen shows when rather than a
  // retry button. `rateLimit` on the result carries the count and reset time.
  | "rate_limited";

// The count and reset time a 429 carries, so the screen can say how many were
// used and when the next one frees up. `resetsAt` is null only if the route
// somehow sent none, which the render sites already tolerate.
export type RateLimitInfo = {
  used: number;
  limit: number;
  resetsAt: Date | null;
};

// The outcome of asking the server to generate commentary. `failure` is null on
// success; `partial` means the summary shipped but at least one per-move note
// did not. Either way `commentary` holds whatever is available, so the caller
// can always render something.
export type CommentaryResult = {
  commentary: GameCommentary;
  failure: CommentaryFailure | null;
  // Set only when `failure` is "rate_limited". Null otherwise.
  rateLimit: RateLimitInfo | null;
  partial: boolean;
  cached: boolean;
};

// Whether pressing Try again could plausibly end differently. Everything but an
// outright refusal could: Groq is flaky, the network comes back, a server read
// can succeed on a second pass, and a missing analysis is something the caller
// runs before asking again.
export function isRetriableFailure(failure: CommentaryFailure): boolean {
  return failure !== "refused" && failure !== "rate_limited";
}

// What a non-2xx answer from our own route means. Pure, and separate from the
// fetch, so the mapping from the route's error codes to the five outcomes above
// can be read and tested in one place. An unrecognised code is treated as a
// server fault rather than a refusal: guessing "retry cannot help" would strand
// the user, and guessing the other way costs one request.
export function classifyFailure(status: number, errorCode: string | null): CommentaryFailure {
  if (errorCode === "not_analyzed") return "not_analyzed";
  if (errorCode === "not_coach_mode") return "refused";
  if (status === 429 || errorCode === "rate_limit_exceeded") return "rate_limited";
  if (status === 401 || status === 403 || status === 404) return "refused";
  return "server";
}

function endpoint(gameId: string): string {
  return `/api/games/${encodeURIComponent(gameId)}/coach`;
}

// Pulls the commentary shape out of a response body without trusting it blindly:
// the rows come from our own route, but the summary may be null and the moves may
// be absent, so both are normalised here.
function readCommentary(body: unknown): GameCommentary {
  if (body === null || typeof body !== "object") {
    return { summary: null, moves: [] };
  }
  const record = body as { summary?: unknown; moves?: unknown };
  const summary = typeof record.summary === "string" ? record.summary : null;
  const moves = Array.isArray(record.moves) ? (record.moves as StoredMoveCommentary[]) : [];
  return { summary, moves };
}

function readFlag(body: unknown, key: "failed" | "partial" | "cached"): boolean {
  if (body === null || typeof body !== "object") return false;
  return (body as Record<string, unknown>)[key] === true;
}

// Loads any commentary already stored for the game. An empty result (null
// summary, no moves) is a normal answer: the game has not been commentated yet.
export async function fetchCommentary(gameId: string): Promise<GameCommentary> {
  const response = await fetch(endpoint(gameId), { method: "GET" });
  if (!response.ok) {
    throw new Error("The saved commentary could not be loaded.");
  }
  const body: unknown = await response.json().catch(() => null);
  return readCommentary(body);
}

// The route's own error code from a non-2xx body, when it sent one.
function readErrorCode(body: unknown): string | null {
  if (body === null || typeof body !== "object") return null;
  const error = (body as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}

// The count and reset time out of a 429 body. Each field is read defensively:
// the route sends all three, but a number that is missing or not a number falls
// back to the limit itself, and a bad date to null, so the screen never renders
// NaN or an "Invalid Date".
function readRateLimit(body: unknown): RateLimitInfo {
  const record = body === null || typeof body !== "object" ? {} : (body as Record<string, unknown>);
  const limit = typeof record.limit === "number" ? record.limit : 0;
  const used = typeof record.used === "number" ? record.used : limit;

  let resetsAt: Date | null = null;
  if (typeof record.resets_at === "string") {
    const parsed = new Date(record.resets_at);
    if (!Number.isNaN(parsed.getTime())) resetsAt = parsed;
  }

  return { used, limit, resetsAt };
}

const NOTHING: GameCommentary = { summary: null, moves: [] };

// Asks the server to generate commentary, or return what it already has. Never
// throws: every way this can go wrong comes back as a `failure`, so the caller
// can degrade to showing the classifications and decide whether to offer a
// retry, rather than wrapping the call in a catch to find out.
export async function generateCommentary(gameId: string): Promise<CommentaryResult> {
  let response: Response;
  try {
    response = await fetch(endpoint(gameId), { method: "POST" });
  } catch {
    // Offline or a dropped connection: nothing was generated, and nothing was
    // spent either, so this is always worth trying again.
    return { commentary: NOTHING, failure: "network", rateLimit: null, partial: false, cached: false };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const failure = classifyFailure(response.status, readErrorCode(body));
    return {
      commentary: NOTHING,
      failure,
      rateLimit: failure === "rate_limited" ? readRateLimit(body) : null,
      partial: false,
      cached: false,
    };
  }

  const commentary = readCommentary(body);
  // A 200 with failed:true is the route's "Groq could not produce a summary"
  // signal, and it writes nothing when that happens, so the game stays whole
  // and retriable. Otherwise a summary means success, even if some notes are
  // missing: those are degraded, not failed.
  const groqFailed = readFlag(body, "failed") || commentary.summary === null;

  return {
    commentary,
    failure: groqFailed ? "groq" : null,
    rateLimit: null,
    partial: readFlag(body, "partial"),
    cached: readFlag(body, "cached"),
  };
}
