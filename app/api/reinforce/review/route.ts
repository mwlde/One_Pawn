import { NextResponse } from "next/server";

import { reviewSchema } from "@/lib/srs/review-schema";
import { computeNextReview } from "@/lib/srs/sm2";
import { createClient } from "@/lib/supabase/server";

const TABLE_MISSING = "PGRST205";

type SrsStateRow = {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

// Session, verified email and validation in the same order as
// app/api/lessons/progress/route.ts. Then a read, SM-2 in TypeScript, and a
// write.
//
// Read then write rather than one database function, unlike graduation. The
// algorithm lives in lib/srs/sm2.ts, where it is tested, and a copy in SQL
// would be a second implementation to keep in step. The cost is that two
// reviews of the same lesson racing both start from the same row and the last
// write wins. Both would compute from the same state, so the stored row is
// still one correct SM-2 step, and the review screen disables its buttons
// while a grade is saving.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "email_not_verified" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_review_data" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[reinforce/review] rejected payload", parsed.error.issues);
    return NextResponse.json({ error: "invalid_review_data" }, { status: 400 });
  }
  const { lesson_id, quality } = parsed.data;

  // The user_id filter restates the select policy. RLS would return nothing for
  // another user's row either way.
  const current = await supabase
    .from("srs_state")
    .select("ease_factor, interval_days, repetitions")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson_id)
    .maybeSingle<SrsStateRow>();

  if (current.error !== null) {
    if (current.error.code === TABLE_MISSING) {
      console.error(
        "[reinforce/review] srs_state table not found. Apply supabase/migrations/20260917130100_srs_state.sql.",
        current.error,
      );
    } else {
      console.error("[reinforce/review] srs_state read failed", current.error);
    }
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Not graduated, so there is nothing to review. Not an error in the request's
  // shape, which is why it is not a 400.
  if (current.data === null) {
    return NextResponse.json({ error: "not_in_queue" }, { status: 404 });
  }

  const now = new Date();
  const next = computeNextReview(
    {
      easeFactor: current.data.ease_factor,
      intervalDays: current.data.interval_days,
      repetitions: current.data.repetitions,
    },
    quality,
    now,
  );

  const { error } = await supabase
    .from("srs_state")
    .update({
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      next_review_at: next.nextReviewAt.toISOString(),
      last_reviewed_at: now.toISOString(),
    })
    .eq("user_id", user.id)
    .eq("lesson_id", lesson_id);

  if (error !== null) {
    console.error("[reinforce/review] srs_state update failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { reviewed: true, next_review_at: next.nextReviewAt.toISOString() },
    { status: 200 },
  );
}
