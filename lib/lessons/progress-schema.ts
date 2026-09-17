// The validator for POST /api/lessons/progress. Kept out of ./progress.ts, which
// the lesson player imports, so zod stays out of the client bundle. Same split
// as lib/game/save-schema.ts.

import { z } from "zod";

import { isLessonId } from "./load";

export const saveProgressSchema = z.object({
  // Length first, so an oversized string is refused before the lookup. The
  // lookup is what matters: a row for a lesson the app does not ship could
  // never be shown, so it is not stored.
  lesson_id: z.string().min(1).max(100).refine(isLessonId),
  used_hints: z.boolean(),
  // The ceiling bounds what a hand-crafted request can store; no real run gets
  // near it. A lesson of a handful of steps would take a thousand wrong drags
  // to reach it, so the unwinnable retry above the ceiling (Retry resends the
  // same frozen payload) is not a case the player needs to handle.
  mistake_count: z.number().int().nonnegative().max(1000),
  // One entry per mistake, so the same ceiling. Entries are not checked against
  // the lesson's steps: they are a log for analysis, and nothing reads them to
  // decide anything. The length cap bounds what a crafted request can store.
  wrong_moves: z.array(z.string().min(1).max(200)).max(1000).optional(),
});
