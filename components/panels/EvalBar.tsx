import { formatBalance, whiteShare } from "@/lib/game/evaluation";
import type { Side } from "@/lib/game/settings";

type EvalBarProps = {
  balance: number;
  // The bar follows the board, so the player's own colour is always the end
  // nearest them.
  orientation: Side;
};

export function EvalBar({ balance, orientation }: EvalBarProps) {
  const blackFraction = 1 - whiteShare(balance);
  const blackSegment = (
    <div className="w-full bg-info" style={{ height: `${blackFraction * 100}%` }} />
  );

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div
        role="img"
        aria-label={`Material balance ${formatBalance(balance)}`}
        className="flex w-2 flex-1 flex-col border border-rule bg-surface"
      >
        {orientation === "white" ? (
          <>
            {blackSegment}
            <div className="flex-1" />
          </>
        ) : (
          <>
            <div className="flex-1" />
            {blackSegment}
          </>
        )}
      </div>
      <div className="font-mono text-xs tabular-nums text-graphite">
        {formatBalance(balance)}
      </div>
    </div>
  );
}
