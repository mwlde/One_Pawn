// The 4px bar from wireframes 05 and 05b. Decorative: the "X / Y complete" text
// beside it carries the same information for a screen reader.
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div aria-hidden className="relative h-1 bg-tint">
      <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${percent}%` }} />
    </div>
  );
}
