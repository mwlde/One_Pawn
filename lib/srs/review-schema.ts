// The validator for POST /api/reinforce/review. Kept out of ./review.ts, which
// the review screen imports, so zod stays out of the client bundle. Same split
// as lib/lessons/progress-schema.ts.

import { z } from "zod";

import { isLessonId } from "@/lib/lessons/load";

export const reviewSchema = z.object({
  lesson_id: z.string().min(1).max(100).refine(isLessonId),
  // The full SM-2 scale, not only the three the buttons send. The route's job
  // is to apply the algorithm; which qualities the UI offers is the UI's call.
  quality: z.literal([0, 1, 2, 3, 4, 5]),
});
