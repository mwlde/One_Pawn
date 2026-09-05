import { NextResponse } from "next/server";

import { saveGameSchema } from "@/lib/game/save-schema";
import { createClient } from "@/lib/supabase/server";

// PostgREST's code for "this table is not in the schema cache", which is what an
// unapplied migration looks like from here.
const TABLE_MISSING = "PGRST205";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Before anything else, because every other failure here reads as a bug in
  // this route, while this one is an environment that never received the
  // migration. RLS keeps the row itself out of reach, so this reads a column
  // that may well come back empty: what is being asked is whether the table is
  // there at all.
  //
  // Not a head request. PostgREST answers those with no body, so supabase-js has
  // no error payload to parse and hands back a bare message with no code, which
  // is exactly the field this needs.
  const probe = await supabase.from("games").select("id").limit(1);
  if (probe.error !== null && probe.error.code === TABLE_MISSING) {
    console.error(
      "[games/save] games table not found. NEXT_PUBLIC_SUPABASE_URL points at a project without the Phase 1 schema. Apply supabase/migrations/20260904154403_games_table.sql.",
      probe.error,
    );
    return NextResponse.json(
      {
        error: "games_table_missing",
        message:
          "games table not found: the migration has not been applied to the Supabase project.",
      },
      { status: 500 },
    );
  }
  if (probe.error !== null) {
    // Anything else is left to the insert to run into properly rather than
    // failing a save on a probe that may have been a blip.
    console.error("[games/save] table probe failed", probe.error);
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
    return NextResponse.json({ error: "invalid_game_data" }, { status: 400 });
  }

  const parsed = saveGameSchema.safeParse(body);
  if (!parsed.success) {
    // Which field failed stays server-side. The client wrote this payload, so
    // telling it what the validator wants only helps someone probing the shape.
    console.error("[games/save] rejected payload", parsed.error.issues);
    return NextResponse.json({ error: "invalid_game_data" }, { status: 400 });
  }

  // user_id comes from the session, never from the body. The insert policy
  // checks it against auth.uid() as well, so a mismatch is rejected by the
  // database rather than trusted here.
  const { data, error } = await supabase
    .from("games")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error !== null || data === null) {
    console.error("[games/save] insert failed", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const id: unknown = data.id;
  if (typeof id !== "string") {
    console.error("[games/save] insert returned no id", data);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
