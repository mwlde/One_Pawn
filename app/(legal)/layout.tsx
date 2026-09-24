import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/ui/SiteFooter";

// The legal documents sit outside the (app) group: they need no chess engine
// and no session, so they render as static pages with a plain reading column.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-rule px-4 md:h-14 md:px-8">
        <Link href="/" className="font-display text-lg font-bold tracking-[-0.02em]">
          One Pawn
        </Link>
        <Link href="/" className="text-sm text-graphite transition-colors hover:text-ink">
          Back
        </Link>
      </header>

      {/* Measure capped for reading rather than filling the window. */}
      <main className="flex-1 px-6 py-12 md:px-8">
        <article className="mx-auto w-full max-w-[680px] pb-8">{children}</article>
      </main>

      <SiteFooter />
    </div>
  );
}
