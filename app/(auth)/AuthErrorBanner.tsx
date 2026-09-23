// Wireframe S3: the error banner carries a heavier border rather than a colour,
// because the palette has no red in it. The label says which action failed, so
// a banner that survives a scroll still names what it belongs to.
//
// No "use client" directive: it holds no state, so it renders on the server for
// the pages that import it directly.
export function AuthErrorBanner({ label, message }: { label: string; message: string }) {
  return (
    <div role="alert" className="mb-4 border-[1.5px] border-ink bg-panel px-3.5 py-3">
      <div className="mb-1 font-mono text-[9px] tracking-[0.14em] text-ink">✕ {label}</div>
      <p className="text-xs text-ink">{message}</p>
    </div>
  );
}
