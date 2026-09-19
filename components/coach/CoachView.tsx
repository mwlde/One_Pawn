"use client";

import { CLASSIFICATION_DISPLAY } from "@/lib/analysis/display";
import {
  reasonAddsHeading,
  REASON_DISPLAY,
  type ClassificationDisplay,
  type NotableDisplay,
} from "@/lib/coach/display";

type CoachViewProps = {
  // The whole-game summary paragraph, or null when there is none to show.
  summary: string | null;
  // The moves the coach commented on, in ply order.
  notableMoves: NotableDisplay[];
  // When true, Groq could not produce commentary. The summary and notes are
  // empty; the classification fallback is shown instead, with a retry.
  commentaryUnavailable?: boolean;
  fallbackMoves?: ClassificationDisplay[];
  onRetryCommentary?: (() => void) | null;
  // Jumps the replay board to a ply. Absent on the post-game modal, where there
  // is no board behind the result to move.
  onSelectPly?: (ply: number) => void;
};

function ClassificationBadge({ classification }: { classification: NotableDisplay["classification"] }) {
  const style = CLASSIFICATION_DISPLAY[classification];
  return (
    <span
      className={`shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${style.badge}`}
    >
      {style.label}
    </span>
  );
}

// A single commented move. Rendered as a button when the board can follow the
// selection, and as a plain block otherwise.
function NotableRow({
  move,
  onSelectPly,
}: {
  move: NotableDisplay;
  onSelectPly?: (ply: number) => void;
}) {
  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-[11px]">
        {move.label}
        {reasonAddsHeading(move.reason) ? (
          <span className="ml-2 text-muted">{REASON_DISPLAY[move.reason]}</span>
        ) : null}
      </span>
      <ClassificationBadge classification={move.classification} />
    </div>
  );

  const body = (
    <>
      <p className="mt-1.5 text-xs leading-relaxed">{move.commentary}</p>
      <p className="mt-1.5 font-mono text-[10px] text-muted">
        {move.bestSan === null ? "engine agreed with this move" : `engine preferred ${move.bestSan}`}
      </p>
    </>
  );

  if (onSelectPly === undefined) {
    return (
      <li className="border-b border-dashed border-hairline p-3 last:border-b-0">
        {header}
        {body}
      </li>
    );
  }

  return (
    <li className="border-b border-dashed border-hairline last:border-b-0">
      <button type="button" onClick={() => onSelectPly(move.ply)} className="w-full p-3 text-left hover:bg-tint">
        {header}
        {body}
      </button>
    </li>
  );
}

function FallbackRow({
  move,
  onSelectPly,
}: {
  move: ClassificationDisplay;
  onSelectPly?: (ply: number) => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px]">{move.label}</span>
        <ClassificationBadge classification={move.classification} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-muted">
        <span>{move.bestSan === null ? "engine's choice" : `best ${move.bestSan}`}</span>
        <span>{move.evalLoss > 0 ? `-${move.evalLoss} cp` : "0 cp"}</span>
      </div>
    </>
  );

  if (onSelectPly === undefined) {
    return <li className="border-b border-dashed border-hairline px-3 py-2 last:border-b-0">{content}</li>;
  }
  return (
    <li className="border-b border-dashed border-hairline last:border-b-0">
      <button type="button" onClick={() => onSelectPly(move.ply)} className="w-full px-3 py-2 text-left hover:bg-tint">
        {content}
      </button>
    </li>
  );
}

export function CoachView({
  summary,
  notableMoves,
  commentaryUnavailable = false,
  fallbackMoves = [],
  onRetryCommentary,
  onSelectPly,
}: CoachViewProps) {
  if (commentaryUnavailable) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-dashed border-hairline px-3 py-2.5">
          <p className="text-xs leading-relaxed">
            Coach commentary unavailable. The analysis is below.
          </p>
          {onRetryCommentary === null || onRetryCommentary === undefined ? null : (
            <button
              type="button"
              onClick={onRetryCommentary}
              className="mt-1.5 border border-ink px-3 py-1 font-mono text-[11px] hover:bg-tint"
            >
              Retry commentary
            </button>
          )}
        </div>
        {fallbackMoves.length === 0 ? null : (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {fallbackMoves.map((move) => (
              <FallbackRow key={move.ply} move={move} onSelectPly={onSelectPly} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {summary === null ? null : (
        <div className="shrink-0 border-b border-dashed border-hairline p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Coach</p>
          <p className="mt-1.5 text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      {notableMoves.length === 0 ? (
        <p className="p-4 text-center text-xs leading-relaxed text-muted">
          No moves stood out for comment. The engine agreed with most of your play.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {notableMoves.map((move) => (
            <NotableRow key={`${move.ply}-${move.reason}`} move={move} onSelectPly={onSelectPly} />
          ))}
        </ul>
      )}
    </div>
  );
}
