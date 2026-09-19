// Browser-side transport for a game's coach commentary: load what is stored, or
// ask the server to generate it. Kept apart from the prompt and selection logic
// so those stay free of fetch. Mirrors lib/analysis/client.ts.
//
// The Groq key and every LLM call live on the server. This module only ever
// talks to our own route, which is the whole point of the split.

import type { GameCommentary, StoredMoveCommentary } from "./types";

// The outcome of asking the server to generate commentary. `failed` means no
// summary could be produced and the game is worth retrying; `partial` means the
// summary shipped but at least one per-move note did not. Either way `commentary`
// holds whatever is available, so the caller can always render something.
export type CommentaryResult = {
  commentary: GameCommentary;
  failed: boolean;
  partial: boolean;
  cached: boolean;
};

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

// Asks the server to generate commentary, or return what it already has. Never
// throws for a Groq-side failure: that comes back as `failed` so the caller can
// degrade to showing the classifications rather than blocking. It throws only
// when the request itself could not be made, which the caller also treats as a
// failed generation.
export async function generateCommentary(gameId: string): Promise<CommentaryResult> {
  let response: Response;
  try {
    response = await fetch(endpoint(gameId), { method: "POST" });
  } catch {
    // Offline or a dropped connection: nothing was generated. Report it as a
    // failure with empty commentary rather than throwing.
    return { commentary: { summary: null, moves: [] }, failed: true, partial: false, cached: false };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // A refusal (not analysed, not coach mode, auth) is not something the user
    // can act on from here, so it degrades the same way a Groq failure does.
    return { commentary: { summary: null, moves: [] }, failed: true, partial: false, cached: false };
  }

  const commentary = readCommentary(body);
  // A 200 with failed:true is the route's "Groq could not produce a summary"
  // signal. Otherwise a summary means success, even if some notes are missing.
  const failed = readFlag(body, "failed") || commentary.summary === null;
  return {
    commentary,
    failed,
    partial: readFlag(body, "partial"),
    cached: readFlag(body, "cached"),
  };
}
