import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { requireSupabaseEnv } from "@/lib/supabase/env";

// Refreshes Supabase's auth cookies on every request. Without this an expired
// access token is never renewed on the server, so server components see a
// logged-out user while the browser still believes it has a session.
//
// Two rules from Supabase's App Router guide that are easy to break:
//   1. Call getUser(), not getSession(). getUser() revalidates the token with
//      Supabase; getSession() trusts whatever the cookie says.
//   2. Return this exact response object. Building a fresh NextResponse here
//      would drop the refreshed cookies and log the user out on every request.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const { url, key } = requireSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
