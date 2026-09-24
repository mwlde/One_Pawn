import Link from "next/link";

import { LogInLink } from "@/components/ui/LogInLink";

// The top bar for the logged-out front of the site: the landing page and the
// log in / register screens. It matches the app shell's TopNav layout (logo and
// nav together on the left, the log-in control on the right, same gutter), so
// the navigation does not slide across the bar when a visitor moves between the
// landing and a tab like Learn. On mobile it keeps only the logo: MobileTabBar
// is the navigation there.
const NAV_LINKS: readonly { label: string; href: string }[] = [
  { label: "Learn", href: "/learn" },
  { label: "Reinforce", href: "/reinforce" },
  { label: "About", href: "/about" },
];

export function SiteHeader() {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-rule px-4 md:h-14 md:px-6">
      <div className="flex items-center gap-8 text-sm">
        <Link href="/" className="font-display text-lg font-bold tracking-[-0.02em]">
          One Pawn
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="text-graphite transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="hidden md:block">
        <LogInLink />
      </div>
    </header>
  );
}
