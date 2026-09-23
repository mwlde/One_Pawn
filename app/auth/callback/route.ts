import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

// Where the confirmation email's link lands. Supabase sends the browser here
// with a one-time PKCE code; exchanging it writes the session cookies, which is
// only possible in a route handler or an action, never in a server component.
//
// The link's target is set by emailRedirectTo in the register form. Without this
// route the code arrives at the landing page, which has nothing to spend it on,
// and the account stays confirmed but logged out.
//
// The password reset email comes through here too, with ?next=/auth/update-password,
// because its code needs spending in exactly the same way. The parameter is
// attacker-controlled, so it is validated as a path on this site before it is
// followed.
const DEFAULT_DESTINATION = "/play";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")) ?? DEFAULT_DESTINATION;

  if (code === null) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    // Expired, already spent, or issued to a different browser than the one
    // opening it: all of them mean the same thing to the person holding it.
    console.error("[auth/callback] code exchange failed", error);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
