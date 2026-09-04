// The decorative left column of wireframe screen 04. Desktop only; mobile drops
// it entirely, which is what the wireframe's own mobile note calls for.
//
// The wireframe fills this panel with a live grandmaster game ("LIVE —
// SPECTATING", two named players, running clocks). Phase 1 has no spectating
// and no live games, and inventing a plausible-looking one would be fake data
// on a production screen. The panel keeps the wireframe's shape and weight but
// says something true instead.
export function AuthPanel() {
  return (
    <div className="hidden flex-col gap-8 border-r border-ink p-12 md:flex">
      <div className="font-mono text-[11px] tracking-[0.1em] text-muted">ONE PAWN</div>

      <div className="flex flex-1 items-center justify-center">
        <div
          aria-hidden
          className="aspect-square w-full max-w-[420px] border border-ink"
          style={{
            background:
              "repeating-conic-gradient(var(--color-tint) 0 25%, var(--color-surface) 0 50%) 0 0 / 25% 25%",
          }}
        />
      </div>

      <div className="border-t border-dashed border-hairline pt-4">
        <p className="text-sm text-ink">Play the engine. Review the game. Remember the lesson.</p>
        <p className="mt-2 font-mono text-[10px] text-muted">
          {"// no account needed to play, only to save"}
        </p>
      </div>
    </div>
  );
}
