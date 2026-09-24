import type { Metadata } from "next";
import Link from "next/link";

import { countCompleted, readCompletions } from "@/lib/lessons/completions";
import { loadTrackLessons } from "@/lib/lessons/load";
import { TRACK_INFO } from "@/lib/lessons/tracks";
import { TRACKS, type Track } from "@/lib/lessons/types";
import { createClient } from "@/lib/supabase/server";

import { ProgressBar } from "./ProgressBar";
import { ProgressNotice } from "./ProgressNotice";

export const metadata: Metadata = {
  title: "Learn · One Pawn",
};

type TrackRowProps = {
  track: Track;
  total: number;
  // Null when progress is not known: logged out, or the read failed.
  done: number | null;
};

// A 4x4 corner of a board per track, with its theme marked on it: pieces in
// mark, the squares they act on in highlight. Squares are [row, column] from
// the top left.
type Motif = { marks: readonly (readonly [number, number])[]; highlights: readonly (readonly [number, number])[] };

const MOTIFS: Record<Track, Motif> = {
  // A piece and the file it moves along.
  basics: { marks: [[3, 1]], highlights: [[2, 1], [1, 1]] },
  // Two pawns side by side in the centre.
  openings: { marks: [[2, 1], [2, 2]], highlights: [[1, 1]] },
  // A knight forking the two squares it attacks.
  tactics: { marks: [[2, 1]], highlights: [[0, 0], [0, 2]] },
  // King beside its pawn, and the square the pawn is heading for.
  endgames: { marks: [[2, 1], [1, 2]], highlights: [[0, 2]] },
};

const SQUARES = Array.from({ length: 16 }, (_, index) => [Math.floor(index / 4), index % 4] as const);

function includesSquare(list: Motif["marks"], row: number, column: number): boolean {
  return list.some(([r, c]) => r === row && c === column);
}

function Thumbnail({ track, empty, complete }: { track: Track; empty: boolean; complete: boolean }) {
  const motif = MOTIFS[track];

  return (
    <div
      aria-hidden
      className={`relative grid h-8 w-8 grid-cols-4 border md:h-11 md:w-11 ${empty ? "border-dashed border-rule-strong opacity-60" : "border-rule"}`}
    >
      {SQUARES.map(([row, column]) => (
        <span
          key={`${row}-${column}`}
          className={
            includesSquare(motif.marks, row, column)
              ? "bg-mark"
              : includesSquare(motif.highlights, row, column)
                ? "bg-highlight"
                : (row + column) % 2 === 0
                  ? "bg-board-light"
                  : "bg-board-dark"
          }
        />
      ))}
      {complete ? (
        <span className="absolute -right-px -top-px flex h-3 w-3 items-center justify-center bg-mark text-xs text-surface md:h-4 md:w-4">
          ✓
        </span>
      ) : null}
    </div>
  );
}

// One row of wireframe 05b, without the library's filters, sort or tags other
// than COMING SOON. On mobile the progress folds under the title, as in 05bm.
function TrackRow({ track, total, done }: TrackRowProps) {
  const { title, description } = TRACK_INFO[track];
  const empty = total === 0;
  const complete = !empty && done === total;
  const inProgress = done !== null && done > 0 && done < total;

  const action = empty ? null : complete ? "Review" : inProgress ? "Resume" : "Start";

  const progress = empty ? null : done === null ? (
    <span className="font-mono text-xs text-graphite">
      {total} {total === 1 ? "lesson" : "lessons"}
    </span>
  ) : (
    <div>
      <ProgressBar done={done} total={total} />
      <div className="mt-1 font-mono text-xs text-graphite">
        {done} / {total} complete
      </div>
    </div>
  );

  return (
    <li>
      <Link
        href={`/learn/${track}`}
        className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded border bg-surface p-3 transition-colors hover:border-rule-strong md:grid-cols-[44px_1fr_120px_auto] md:gap-4 md:p-4 ${
          inProgress ? "border-rule-strong" : "border-rule"
        } ${empty ? "opacity-50" : ""}`}
      >
        <Thumbnail track={track} empty={empty} complete={complete} />

        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-medium md:text-sm">{title}</span>
            {empty ? (
              <span className="text-xs text-graphite">Coming soon</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-snug text-graphite md:text-xs">{description}</p>
          {progress !== null ? <div className="mt-2 md:hidden">{progress}</div> : null}
        </div>

        <div className="hidden md:block">{progress}</div>

        <span className="text-xs text-graphite">{action}</span>
      </Link>
    </li>
  );
}

// Learn is open to everyone. A logged-out visitor sees every track and can play
// every lesson; only saving progress needs an account.
export default async function LearnPage() {
  const supabase = await createClient();
  const progress = await readCompletions(supabase);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-rule px-4 py-6 text-center md:px-8 md:py-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">Learn</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Tracks</h1>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-8">
        <ProgressNotice progress={progress} />

        <ul className="flex flex-col gap-2 md:gap-3">
          {TRACKS.map((track) => {
            const lessons = loadTrackLessons(track);
            const done =
              progress.status === "known" ? countCompleted(progress.completions, lessons) : null;
            return <TrackRow key={track} track={track} total={lessons.length} done={done} />;
          })}
        </ul>
      </div>
    </div>
  );
}
