import { NextResponse } from "next/server";

import { deletionConfirmationMatches } from "@/lib/auth/account-deletion";
import { createClient } from "@/lib/supabase/server";

// PostgREST's code for "this function is not in the schema cache", which is what
// an unapplied migration looks like from here.
const FUNCTION_MISSING = "PGRST202";

// POST rather than DELETE. The request carries a confirmation body, and a DELETE
// with a body is legal but poorly served by caches, proxies and fetch wrappers
// that assume it has none.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "confirmation_mismatch" }, { status: 400 });
  }

  const confirmEmail =
    typeof body === "object" && body !== null && "confirm_email" in body
      ? (body as { confirm_email: unknown }).confirm_email
      : undefined;

  if (typeof confirmEmail !== "string" || !deletionConfirmationMatches(confirmEmail, user.email)) {
    return NextResponse.json(
      {
        error: "confirmation_mismatch",
        message: "That is not the email address on this account. Nothing has been deleted.",
      },
      { status: 400 },
    );
  }

  // No user id is passed. The function reads auth.uid() from the session cookie
  // this request already carries, so there is no argument here that could point
  // the delete at somebody else's account.
  const { error } = await supabase.rpc("delete_own_account");

  if (error !== null) {
    if (error.code === FUNCTION_MISSING) {
      console.error(
        "[account/delete] delete_own_account() not found. Apply supabase/migrations/20260907120000_account_deletion.sql to the Supabase project.",
        error,
      );
    } else {
      console.error("[account/delete] delete failed", error);
    }
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  // No cookie clearing here. The user row is gone, and the auth tables cascade
  // with it, so the session token this request arrived with no longer resolves
  // to anybody. The client signs out afterwards to drop the stale cookie.
  return new NextResponse(null, { status: 204 });
}
