import Link from "next/link";
import type { ReactNode } from "react";

import { AuthPanel } from "@/app/(auth)/AuthPanel";
import { SiteFooter } from "@/components/ui/SiteFooter";

// Wireframe 04: split at 1fr / 520px on desktop. Mobile (04m) drops the left
// panel and lets the form fill the viewport, with a slim back-and-logo header.
//
// The auth screens sit outside the (app) group on purpose. They render no top
// nav and no engine: nothing here needs a chess engine, and downloading the
// WASM module on the login screen would be waste.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* The footer sits below the split rather than inside the form column, so
          it does not inherit that column's padding or push the form off centre. */}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[1fr_520px]">
        <AuthPanel />

        <div className="flex flex-col p-6 md:p-12">
          <header className="mb-10 flex items-center justify-between md:mb-16">
            <Link href="/" className="font-mono text-sm font-semibold">
              One Pawn
            </Link>
            <Link href="/" className="text-[13px] text-muted hover:text-ink">
              ← back
            </Link>
          </header>

          <div className="flex flex-1 flex-col justify-center md:justify-start">{children}</div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
