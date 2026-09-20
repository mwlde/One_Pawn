"use client";

import { useRef } from "react";

import { CLASSIFICATION_DISPLAY } from "@/lib/analysis/display";
import {
  firstSentence,
  reasonAddsHeading,
  REASON_DISPLAY,
  type ClassificationDisplay,
  type NotableDisplay,
} from "@/lib/coach/display";

type CoachViewProps = {
  // The moves the coach commented on, in ply order.
  notableMoves: NotableDisplay[];
  // Which note is open, or null when none is. Owned by the replay screen rather
  // than by this list: the board draws its arrows from the same choice, so one
  // of the two has to hold it and the board cannot.
  selectedPly: number | null;
  // Selecting a note is how the board moves: the replay screen jumps to the
  // position the move was played from, which is what opens the note in turn.
  onSelect: (ply: number) => void;
  // When true, there is no commentary to show. The notes are empty; the
  // classification fallback is shown instead, with whatever retry applies.
  commentaryUnavailable?: boolean;
  fallbackMoves?: ClassificationDisplay[];
  onRetryCommentary?: (() => void) | null;
  // Why there is nothing to show, in words the student can act on. Defaults to
  // the generic sentence when the caller has nothing more specific.
  unavailableMessage?: string;
  // A generation is in flight right now. The retry stays on screen but goes
  // inert: a second press would start a second run of the same expensive work,
  // and hiding the button instead would read as the retry having vanished.
  retryPending?: boolean;
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

// A single commented move: collapsed to its opening sentence, expanded to the
// whole note. Collapsed rows are what make a list of six notes scannable; the
// full text is a click away and only one is ever open.
function NotableRow({
  move,
  isOpen,
  onToggle,
  buttonRef,
  onKeyDown,
}: {
  move: NotableDisplay;
  isOpen: boolean;
  onToggle: () => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <li className="border-b border-dashed border-hairline last:border-b-0">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className={`w-full border-l-2 p-3 text-left hover:bg-tint ${
          isOpen ? "border-l-ink bg-tint" : "border-l-transparent"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px]">
            {move.label}
            {reasonAddsHeading(move.reason) ? (
              <span className="ml-2 text-muted">{REASON_DISPLAY[move.reason]}</span>
            ) : null}
          </span>
          <ClassificationBadge classification={move.classification} />
        </div>

        <p className={`mt-1.5 text-xs leading-relaxed ${isOpen ? "" : "text-muted"}`}>
          {isOpen ? move.commentary : firstSentence(move.commentary)}
        </p>

        {isOpen ? (
          <p className="mt-1.5 font-mono text-[10px] text-muted">
            {move.bestSan === null
              ? "engine agreed with this move"
              : `engine preferred ${move.bestSan}`}
          </p>
        ) : null}
      </button>
    </li>
  );
}

function FallbackRow({
  move,
  onSelect,
}: {
  move: ClassificationDisplay;
  onSelect: (ply: number) => void;
}) {
  return (
    <li className="border-b border-dashed border-hairline last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect(move.ply)}
        className="w-full px-3 py-2 text-left hover:bg-tint"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px]">{move.label}</span>
          <ClassificationBadge classification={move.classification} />
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-muted">
          <span>{move.bestSan === null ? "engine's choice" : `best ${move.bestSan}`}</span>
          <span>{move.evalLoss > 0 ? `-${move.evalLoss} cp` : "0 cp"}</span>
        </div>
      </button>
    </li>
  );
}

// The one retry control the coach surfaces use, so the in-progress and the
// failed state never drift apart in wording or in whether they can be pressed.
//
// Pending shows the button rather than hiding it, and disables it. A button
// that disappears while the work runs reads as the retry having been taken
// away; one that stays and cannot be pressed reads as "not yet", which is what
// is true. Null onClick is the third case: a failure retrying cannot fix.
export function RetryButton({
  onClick,
  pending = false,
  className = "",
}: {
  onClick: (() => void) | null;
  pending?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={pending || onClick === null}
      aria-busy={pending}
      onClick={onClick ?? undefined}
      className={`border border-ink px-3 py-1 font-mono text-[11px] hover:bg-tint disabled:cursor-not-allowed disabled:border-hairline disabled:text-hairline disabled:hover:bg-transparent ${className}`}
    >
      Try again
    </button>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="shrink-0 border-b border-dashed border-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
      {children}
    </p>
  );
}

export function CoachView({
  notableMoves,
  selectedPly,
  onSelect,
  commentaryUnavailable = false,
  fallbackMoves = [],
  onRetryCommentary,
  unavailableMessage,
  retryPending = false,
}: CoachViewProps) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Up and down walk the list, Enter and Space open the row the keyboard is on,
  // which buttons already do for themselves. Moving focus rather than tracking a
  // separate cursor keeps one idea of "where I am" and gives the focus ring for
  // free. The replay screen's own left/right arrows are untouched, so a keyboard
  // user can scrub the game and walk the notes without the two colliding.
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    const target = buttonsRef.current[next];
    if (target === null || target === undefined) return;
    event.preventDefault();
    target.focus();
  }

  if (commentaryUnavailable) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-dashed border-hairline px-3 py-2.5">
          <p className="text-xs leading-relaxed">
            {retryPending
              ? "Coach analysis in progress. The analysis is below while you wait."
              : `${unavailableMessage ?? "Coach commentary unavailable."} The analysis is below.`}
          </p>
          {onRetryCommentary === null || onRetryCommentary === undefined ? null : (
            <RetryButton onClick={onRetryCommentary} pending={retryPending} className="mt-1.5" />
          )}
        </div>
        {fallbackMoves.length === 0 ? null : (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {fallbackMoves.map((move) => (
              <FallbackRow key={move.ply} move={move} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (notableMoves.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Heading>Coach&apos;s notes</Heading>
        <p className="p-4 text-center text-xs leading-relaxed text-muted">
          No moves stood out for comment. The engine agreed with most of your play.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Heading>
        Coach&apos;s notes · {notableMoves.length}{" "}
        {notableMoves.length === 1 ? "move" : "moves"}
      </Heading>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {notableMoves.map((move, index) => (
          <NotableRow
            key={move.ply}
            move={move}
            isOpen={move.ply === selectedPly}
            onToggle={() => onSelect(move.ply)}
            buttonRef={(element) => {
              buttonsRef.current[index] = element;
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
          />
        ))}
      </ul>
    </div>
  );
}
