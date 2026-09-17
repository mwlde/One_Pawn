import { NextResponse } from "next/server";

import { saveProgressSchema } from "@/lib/lessons/progress-schema";
import { createClient } from "@/lib/supabase/server";

// PostgREST's code for "this table is not in the schema cache", which is what an
// unapplied migration looks like from here.
const TABLE_MISSING = "PGRST205";
// The same for a function. Reachable when the table was applied without the
// function that was added to its migration later.
const FUNCTION_MISSING = "PGRST202";

// Mirrors app/api/games/save/route.ts step for step. The comments there explain
// the probe, the ordering and why validation detail stays server-side; only
// what differs is noted here.
export async function POST(request: Request) {
  const supabase = await createClient();

  const probe = await supabase.from("user_progress").select("id").limit(1);
  if (probe.error !== null && probe.error.code === TABLE_MISSING) {
    console.error(
      "[lessons/progress] user_progress table not found. NEXT_PUBLIC_SUPABASE_URL points at a project without the Phase 2 schema. Apply supabase/migrations/20260917120000_user_progress.sql.",
      probe.error,
    );
    return NextResponse.json({ error: "user_progress_table_missing" }, { status: 500 });
  }
  if (probe.error !== null) {
    console.error("[lessons/progress] table probe failed", probe.error);
  }

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
    return NextResponse.json({ error: "invalid_progress_data" }, { status: 400 });
  }

  const parsed = saveProgressSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[lessons/progress] rejected payload", parsed.error.issues);
    return NextResponse.json({ error: "invalid_progress_data" }, { status: 400 });
  }

  // A function rather than supabase-js's upsert, which can only overwrite. On a
  // replay the function keeps the best result, so a perfect run is never
  // undone; the reasoning is in the migration. No user id or timestamp is
  // passed: the function takes auth.uid() and now() itself.
  const { error } = await supabase.rpc("record_lesson_completion", {
    p_lesson_id: parsed.data.lesson_id,
    p_used_hints: parsed.data.used_hints,
    p_mistake_count: parsed.data.mistake_count,
  });

  if (error !== null) {
    if (error.code === FUNCTION_MISSING) {
      console.error(
        "[lessons/progress] record_lesson_completion() not found. The table exists but the function does not. Apply the function from supabase/migrations/20260917120000_user_progress.sql.",
        error,
      );
    } else {
      console.error("[lessons/progress] save failed", error);
    }
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ saved: true }, { status: 200 });
}
