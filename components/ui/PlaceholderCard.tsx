import type { ReactNode } from "react";

// A card for a feature that does not exist yet. Dashed and dimmed so it never
// reads as a working panel, and it never shows invented data: the body says
// what will appear here once the feature ships, not an example of it.
export function PlaceholderCard({
  title,
  indicator = "In development",
  className = "",
  children,
}: {
  title: string;
  indicator?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 border border-dashed border-hairline bg-surface p-5 opacity-70 md:p-6 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
          {indicator}
        </span>
      </div>
      <div className="text-xs leading-relaxed text-muted">{children}</div>
    </div>
  );
}
