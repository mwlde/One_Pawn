import { cookies } from "next/headers";
import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/AuthForm";
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
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const returning = cookieStore.has(RETURNING_VISITOR_COOKIE);
  const { error } = await searchParams;

  return (
    <AuthForm
      mode="login"
      returning={returning}
      initialError={error === "auth_callback_failed" ? CALLBACK_FAILED : null}
    />
  );
}
