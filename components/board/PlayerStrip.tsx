import { formatClock } from "@/lib/game/clock";

type PlayerStripProps = {
  name: string;
  detail: string;
  clockMs: number;
  // Whose turn it is, not who the player is. The wireframe is explicit that the
  // clock inverts on turn rather than on identity.
  active: boolean;
  variant: "opponent" | "self";
};

const OPPONENT_SWATCH = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent 0 3px, var(--ink) 3px 4px)",
};

export function PlayerStrip({ name, detail, clockMs, active, variant }: PlayerStripProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-between rounded border border-rule bg-surface px-3 py-2 md:py-3"
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className={`hidden h-9 w-9 border border-rule-strong md:block ${
            variant === "self" ? "bg-ink" : ""
          }`}
          style={variant === "opponent" ? OPPONENT_SWATCH : undefined}
        />
        <div>
          <div className="text-xs font-medium md:text-sm">{name}</div>
          <div className="text-xs tabular-nums text-graphite">{detail}</div>
        </div>
      </div>
      <div
        className={`rounded border px-3 py-1 font-mono text-base font-medium tabular-nums transition-colors md:py-2 md:text-xl ${
          active ? "border-highlight bg-highlight text-ink" : "border-rule bg-surface text-ink"
        }`}
      >
        {formatClock(clockMs)}
      </div>
    </div>
  );
}
