import Link from "next/link";

// The functional root page, not the marketing landing. The wireframe's hero has
// a live puzzle demo and feature bullets beside it; both need Phase 2 content
// that does not exist yet, so this keeps the half that works: name, tagline,
// one CTA.

// Screen 01 puts Learn and About beside Log in. Neither is built: Learn is
// Phase 2 and About is Stage F prep. They render muted and inert here, the same
// treatment the app shell's TopNav gives its unbuilt tabs, rather than pointing
// at dead routes.
const NAV_LINKS: readonly { label: string; href: string | null }[] = [
  { label: "Learn", href: null },
  { label: "About", href: null },
  { label: "Log in", href: "/login" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-dashed border-hairline px-4 md:h-14 md:px-10">
        <span className="font-mono text-sm font-semibold">One Pawn</span>
        <nav aria-label="Main" className="flex items-center gap-5 text-[13px] md:gap-7">
          {NAV_LINKS.map((link) =>
            link.href === null ? (
              <span
                key={link.label}
                aria-disabled="true"
                title="Coming soon"
                className="cursor-not-allowed text-hairline"
              >
                {link.label}
              </span>
            ) : (
              <Link key={link.label} href={link.href} className="font-medium text-ink hover:underline">
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </header>
      <main className="flex flex-1 items-center px-6 py-16 md:px-20">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            One Pawn
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Play a real engine in your browser. Learn from every game.
          </p>
          <Link
            href="/play"
            className="mt-10 inline-block border border-ink bg-ink px-8 py-4 text-[15px] font-semibold text-panel transition-colors hover:bg-black"
          >
            Play now &rarr;
          </Link>
          <p className="mt-3 font-mono text-xs text-muted">
            no account &middot;{" "}
            <Link href="/login" className="underline hover:text-ink">
              sign in
            </Link>{" "}
            to save games
          </p>
        </div>
      </main>
    </div>
  );
}
