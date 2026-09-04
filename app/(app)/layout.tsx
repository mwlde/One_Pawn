import type { ReactNode } from "react";

import { EngineProvider } from "@/components/EngineProvider";
import { NavChromeProvider, TopNav } from "@/components/ui/TopNav";

// The app shell. The engine lives here rather than on the game page so the
// readiness indicator in the nav and the game itself share one Worker, and so
// the WASM module starts downloading the moment a player enters the app rather
// than when they first press New game.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <EngineProvider>
      <NavChromeProvider>
        {/* TopNav renders both the header and the mobile bottom tab bar; the
            bar is ordered last so it sits below the page content. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <TopNav />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </div>
      </NavChromeProvider>
    </EngineProvider>
  );
}
