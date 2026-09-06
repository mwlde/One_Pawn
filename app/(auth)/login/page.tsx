import { cookies } from "next/headers";
import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/AuthForm";
import { safeNextPath } from "@/lib/auth/next-path";
import { RETURNING_VISITOR_COOKIE } from "@/lib/auth/returning-visitor";

// The only failure /auth/callback can redirect here with. Anything else in the
// parameter is ignored rather than echoed back onto the page.
const CALLBACK_FAILED =
  "That confirmation link could not be used. It may have expired or already been opened. Log in to continue.";

export const metadata: Metadata = {
  title: "Log in · One Pawn",
};

// Read on the server so the heading is right in the first paint. Reading the
// cookie makes this route dynamic, which costs nothing: it renders no data and
// hits no database.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const cookieStore = await cookies();
  const returning = cookieStore.has(RETURNING_VISITOR_COOKIE);
  const { error, next } = await searchParams;

  return (
    <AuthForm
      mode="login"
      returning={returning}
      initialError={error === "auth_callback_failed" ? CALLBACK_FAILED : null}
      // Where a redirect from an auth-gated route wants the user sent back to.
      // Validated here rather than in the form: anything that is not a path on
      // this site is dropped, so the form only ever sees somewhere safe to go.
      next={safeNextPath(next)}
    />
  );
}
