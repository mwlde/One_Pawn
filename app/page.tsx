import Link from "next/link";

// The functional root page, not the marketing landing. The wireframe's hero has
// a live puzzle demo and feature bullets beside it; both need Phase 2 content
// that does not exist yet, so this keeps the half that works: name, tagline,
// one CTA.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center border-b border-dashed border-hairline px-4 font-mono text-sm font-semibold md:h-14 md:px-10">
        One Pawn
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
            no account needed
          </p>
        </div>
      </main>
    </div>
  );
}
