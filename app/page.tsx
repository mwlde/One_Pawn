import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/app/(auth)/AuthForm";
import { AuthPanel } from "@/app/(auth)/AuthPanel";
import { StaticBoard } from "@/components/board/StaticBoard";
import { buttonClasses } from "@/components/ui/Button";
import { DeletedNotice } from "@/components/ui/DeletedNotice";
import { MobileTabBar } from "@/components/ui/MobileTabBar";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { HIGHLIGHTER } from "@/components/ui/highlighter";
import { RETURNING_VISITOR_COOKIE } from "@/lib/auth/returning-visitor";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "One Pawn",
};

// The front door. On desktop it is the auth screen: the same split (product line
// and a movable demo board on the left, the log in / register form on the right)
// the /login and /register routes render, so pressing the logo lands on a board
// and a way in. On mobile the playable board does not fit, so it becomes a plain
// hero: the product line, a small static board, and two buttons (log in /
// register, or play now as a guest). Both carry the site header; on mobile it
// is only the logo, with the tab bar along the bottom.
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
      {/* Only a guest ever sees this page, so the tabs point Home here and
          Profile at log in. */}
      <MobileTabBar loggedIn={false} />

      {/* The deletion confirmation, shown once after the account-delete
          redirect. Null the rest of the time, so it costs no layout. */}
      <Suspense fallback={null}>
        {/* Collapsed on mobile when there is no notice, so its padding does
            not push the hero down on every visit. */}
        <div className="px-6 pt-6 max-md:empty:hidden md:px-12">
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

      {/* Mobile: the product line as the headline (the nav already carries the
          name), a small static preview board, and the ways in. The board is
          the product, so it shows at every width, but here it is a picture
          rather than a game; the full-size board is one tap away on /play.
          The headline lines up with the nav logo on the 16px gutter. */}
      <div className="flex flex-1 flex-col gap-6 px-4 pb-12 pt-8 md:hidden">
        {/* inline-block with leading-none sizes the marker's box to the letters,
            so the band covers their lower part as in the nav; inline, the box
            is Bricolage's tall ascent-to-descent and the band sat under the
            text. The non-breaking space and clone guard against a split. */}
        <h1 className="font-display text-[28px] font-bold leading-[1.15] tracking-[-0.02em]">
          Play a real engine in your browser. Learn from{" "}
          <span className={`${HIGHLIGHTER} inline-block box-decoration-clone leading-none`}>every&nbsp;game</span>.
        </h1>

        <div className="aspect-square w-[min(78vw,320px)] self-center">
          <StaticBoard />
        </div>

        {/* Log in or register leads. Play now goes to /play, which opens on
            the new game setup, and the caption under it says a guest can play
            without an account. */}
        <div className="flex flex-col">
          <Link href="/login" className={`${buttonClasses("primary")} w-full`}>
            Log in or register
          </Link>
          <Link href="/play" className={`${buttonClasses("secondary")} mt-3 w-full`}>
            Play now
          </Link>
          <p className="mt-2 text-center text-xs text-muted">
            Play as a guest. No account needed to play.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
