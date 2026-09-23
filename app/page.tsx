import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/app/(auth)/AuthForm";
import { AuthPanel } from "@/app/(auth)/AuthPanel";
import { DeletedNotice } from "@/components/ui/DeletedNotice";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { RETURNING_VISITOR_COOKIE } from "@/lib/auth/returning-visitor";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "One Pawn",
};

// The front door. On desktop it is the auth screen: the same split (product line
// and a movable demo board on the left, the log in / register form on the right)
// the /login and /register routes render, so pressing the logo lands on a board
// and a way in. On mobile the board does not fit, so it is dropped for a plain
// hero: the name, the one line under it, and two buttons (log in / register, or
// play as guest). Both carry the full site header.
export default async function Home() {
  // A signed-in visitor has no use for a login form, and the app's own logo
  // points here, so they are sent on to their dashboard rather than shown one.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user !== null) redirect("/dashboard");

  // Same returning-visitor heading the login route uses, read the same way.
  const cookieStore = await cookies();
  const returning = cookieStore.has(RETURNING_VISITOR_COOKIE);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />

      {/* The deletion confirmation, shown once after the account-delete
          redirect. Null the rest of the time, so it costs no layout. */}
      <Suspense fallback={null}>
        <div className="px-6 pt-6 md:px-12">
          <DeletedNotice />
        </div>
      </Suspense>

      {/* Desktop: the split auth screen. */}
      <div className="hidden flex-1 grid-cols-[1fr_520px] md:grid">
        <AuthPanel />
        <div className="flex flex-col p-12">
          <div className="flex flex-1 flex-col justify-start">
            <AuthForm mode="login" returning={returning} />
          </div>
        </div>
      </div>

      {/* Mobile: no board, just the name, the line under it, and the two ways
          in. Log in leads to the full form on /login, which keeps its own guest
          option below it. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12 text-center md:hidden">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">One Pawn</h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Play a real engine in your browser. Learn from every game.
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/login"
            className="block border border-ink bg-ink px-5 py-4 text-center text-sm font-semibold text-panel transition-colors hover:bg-black"
          >
            Log in or register
          </Link>
          <Link
            href="/play"
            className="block border border-ink px-5 py-4 text-center text-sm transition-colors hover:bg-tint"
          >
            Play as guest
          </Link>
          <p className="text-[11px] text-muted">No account needed to play.</p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
