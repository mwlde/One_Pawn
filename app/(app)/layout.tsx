import type { ReactNode } from "react";

import { EngineProvider } from "@/components/EngineProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { NavChromeProvider, TopNav } from "@/components/ui/TopNav";
import { createClient } from "@/lib/supabase/server";

// The app shell. The engine lives here rather than on the game page so the
// readiness indicator in the nav and the game itself share one Worker, and so
// the WASM module starts downloading the moment a player enters the app rather
// than when they first press New game.
//
// The group is named (app) and documented as "auth-gated", but nothing here is
// gated yet: Phase 1 lets anyone play without an account. The session is read
// only so the nav can show who is logged in. Gating arrives with the screens
// that actually hold user data.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <EngineProvider>
      <SessionProvider initialUserId={user?.id ?? null}>
        <NavChromeProvider>
          {/* TopNav renders both the header and the mobile bottom tab bar; the
              bar is ordered last so it sits below the page content. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <TopNav initialEmail={user?.email ?? null} />
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        </NavChromeProvider>
      </SessionProvider>
    </EngineProvider>
  );
}
