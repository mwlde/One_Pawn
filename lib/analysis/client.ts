// Browser-side transport for a game's analysis: load what is stored, or save
// what was just computed. Kept apart from the analysis primitives so those stay
// free of fetch and can run in a test or, later, a worker.

import type { MoveAnalysis } from "./types";

// A stored row carries everything a computed one does, plus the timestamp the
// database stamped it with. All rows of one game share that timestamp, so the
// UI reads it off the first to show when the analysis was run.
export type StoredAnalysis = MoveAnalysis & { created_at: string };

function endpoint(gameId: string): string {
  return `/api/games/${encodeURIComponent(gameId)}/analyze`;
}

async function readMoves(response: Response): Promise<StoredAnalysis[]> {
  const body: unknown = await response.json().catch(() => null);
  if (body === null || typeof body !== "object" || !("moves" in body)) {
    throw new Error("The server returned an unexpected response.");
  }
  const moves = (body as { moves: unknown }).moves;
  if (!Array.isArray(moves)) {
    throw new Error("The server returned an unexpected response.");
  }
  // The rows come from our own route, which validated and inserted them, so
  // this trusts their shape rather than revalidating every field on the client.
  return moves as StoredAnalysis[];
}

// Loads any analysis already stored for the game. An empty array is a normal
// answer, not an error: it means the game has not been analysed yet.
export async function fetchAnalysis(gameId: string): Promise<StoredAnalysis[]> {
  const response = await fetch(endpoint(gameId), { method: "GET" });
  if (!response.ok) {
    throw new Error("The saved analysis could not be loaded.");
  }
  return readMoves(response);
}

// Persists a freshly computed analysis and returns the stored rows. If the game
// already had one the route returns that instead of inserting again, so this is
// safe to call even when a race stored one first.
export async function saveAnalysis(
  gameId: string,
  moves: MoveAnalysis[],
): Promise<StoredAnalysis[]> {
  const response = await fetch(endpoint(gameId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moves }),
  });
  if (!response.ok) {
    throw new Error("The analysis could not be saved.");
  }
  return readMoves(response);
}
