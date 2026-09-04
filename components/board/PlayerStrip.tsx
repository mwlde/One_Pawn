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
    "repeating-linear-gradient(45deg, transparent 0 3px, var(--color-ink) 3px 4px)",
};

export function PlayerStrip({ name, detail, clockMs, active, variant }: PlayerStripProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-between border px-3 py-2 md:px-3.5 md:py-2.5 ${
        active ? "border-solid border-ink" : "border-dashed border-hairline"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className={`hidden h-9 w-9 border border-ink md:block ${
            variant === "self" ? "bg-ink" : ""
          }`}
          style={variant === "opponent" ? OPPONENT_SWATCH : undefined}
        />
        <div>
          <div className="text-xs font-semibold md:text-[13px]">{name}</div>
          <div className="font-mono text-[10px] text-muted">{detail}</div>
        </div>
      </div>
      <div
        className={`border border-ink px-2.5 py-1 font-mono text-base font-semibold tabular-nums md:px-3.5 md:py-2 md:text-xl ${
          active ? "bg-ink text-panel" : ""
        }`}
      >
        {formatClock(clockMs)}
      </div>
    </div>
  );
}
