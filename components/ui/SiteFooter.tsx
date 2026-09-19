import Link from "next/link";

import { APP_STAGE, APP_VERSION } from "@/lib/version";

// Compliance surface, not marketing space: the legal documents plus About,
// which is where the contact addresses and the operator are explained. Every
// page that is not the game screen carries it, so these are always one click
// away.
//
// No "use client" directive on purpose. Without one this renders on the server
// in the layouts that import it directly, and joins the client bundle only
// where a client component pulls it in (the app shell, which has to check the
// route before deciding whether to show it at all).
const FOOTER_LINKS: readonly { label: string; href: string }[] = [
  { label: "About", href: "/about" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter() {
  // Read at render rather than hardcoded. On the statically rendered pages that
  // fixes the year at build time, which is close enough: the site redeploys far
  // more often than once a year.
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-dashed border-hairline px-4 py-4 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-[10px] text-muted">
        <span>
          &copy; {year} One Pawn <span className="text-hairline"></span> v{APP_VERSION}{" "}
          <span className="text-hairline"></span> {APP_STAGE}
        </span>
        <nav aria-label="Footer" className="flex items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
