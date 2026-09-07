import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/ui/SiteFooter";

// The legal documents sit outside the (app) group: they need no chess engine
// and no session, so they render as static pages with a plain reading column.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-dashed border-hairline px-4 md:h-14 md:px-10">
        <Link href="/" className="font-mono text-sm font-semibold">
          One Pawn
        </Link>
        <Link href="/" className="text-[13px] text-muted hover:text-ink">
          &larr; back
        </Link>
      </header>

      {/* Measure capped for reading rather than filling the window. */}
      <main className="flex-1 px-6 py-12 md:px-10 md:py-16">
        <article className="mx-auto w-full max-w-[680px] pb-8">{children}</article>
      </main>

      <SiteFooter />
    </div>
  );
}
