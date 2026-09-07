import type { ReactNode } from "react";

// Shared building blocks for the legal documents. The class strings live here
// rather than being repeated down three long pages, so the documents themselves
// read as content and a change to the reading style happens in one place.
//
// No typography plugin: that would be a new dependency for three static pages,
// and CLAUDE.md asks before adding one.

export function DocHeader({
  title,
  version,
  updated,
}: {
  title: string;
  version: string;
  updated: string;
}) {
  return (
    <header className="border-b border-ink pb-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.01em] md:text-[40px]">
        {title}
      </h1>
      <p className="mt-4 font-mono text-[11px] tracking-[0.06em] text-muted">
        Version {version} &middot; Last updated {updated}
      </p>
    </header>
  );
}

// Numbered so a future version can point at "section 7" and mean something.
export function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-[-0.01em]">
        <span className="mr-3 font-mono text-[13px] font-normal text-muted">{number}.</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-ink first:mt-0">{children}</p>;
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed text-ink">{children}</ul>
  );
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-[0.55em] h-px w-3 shrink-0 bg-hairline" />
      <span>{children}</span>
    </li>
  );
}

// Used where a document describes something the app does not do yet. Marking
// these inline keeps the documents honest about what is live today without
// splitting every section into a "now" and "later" half.
export function Future({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] tracking-[0.06em] text-muted">[{children}]</span>;
}

export function Contact({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className="font-mono text-[13px] underline hover:text-muted">
      {address}
    </a>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[13px]">{children}</span>;
}
