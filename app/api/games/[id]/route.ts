import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Postgres rejects a malformed uuid with an error rather than an empty result,
// so an id that cannot be one is answered here instead of being sent down.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  if (!UUID.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // No user_id filter. The delete policy pins the row to auth.uid(), so
  // somebody else's game matches nothing here rather than being deleted: the
  // database is the check, and adding a second one in the query would suggest
  // it is not.
  //
  // select() is what makes "deleted nothing" visible. Without it a delete that
  // matched no rows is indistinguishable from one that matched, and this route
  // would answer 204 for a game it never had permission to touch.
  const { data, error } = await supabase.from("games").delete().eq("id", id).select("id");

  if (error !== null) {
    console.error("[games/delete] delete failed", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  if (data === null || data.length === 0) {
    // Either the game does not exist or it belongs to someone else. The same
    // answer for both, so this route cannot be used to find out which.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
