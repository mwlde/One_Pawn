import { cookies } from "next/headers";
import type { Metadata } from "next";

import { AuthForm } from "@/app/(auth)/AuthForm";
import { RETURNING_VISITOR_COOKIE } from "@/lib/auth/returning-visitor";

export const metadata: Metadata = {
  title: "Log in · One Pawn",
};

// Read on the server so the heading is right in the first paint. Reading the
// cookie makes this route dynamic, which costs nothing: it renders no data and
// hits no database.
export default async function LoginPage() {
  const cookieStore = await cookies();
  const returning = cookieStore.has(RETURNING_VISITOR_COOKIE);

  return <AuthForm mode="login" returning={returning} />;
}
