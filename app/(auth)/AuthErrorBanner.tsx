// An ink border rather than the accent, which is kept for actions. The label
// says which action failed, so a banner that survives a scroll still names what
// it belongs to.
//
// No "use client" directive: it holds no state, so it renders on the server for
// the pages that import it directly.
export function AuthErrorBanner({ label, message }: { label: string; message: string }) {
  return (
    <div role="alert" className="mb-4 rounded border border-ink bg-surface px-3 py-3">
      <div className="mb-1 text-xs font-medium text-ink">✕ {label}</div>
      <p className="text-xs text-ink">{message}</p>
    </div>
  );
}
