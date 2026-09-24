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
      className={`flex flex-col gap-3 rounded border border-dashed border-rule-strong bg-surface p-4 opacity-70 md:p-6 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-medium">{title}</h2>
        <span className="shrink-0 text-xs text-graphite">
          {indicator}
        </span>
      </div>
      <div className="text-sm leading-relaxed text-graphite">{children}</div>
    </div>
  );
}
