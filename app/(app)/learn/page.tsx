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

function Thumbnail({ empty, complete }: { empty: boolean; complete: boolean }) {
  return (
    <div
      aria-hidden
      className={`relative h-8 w-8 border md:h-11 md:w-11 ${empty ? "border-dashed border-hairline" : "border-ink"}`}
      style={{
        background:
          "repeating-conic-gradient(var(--color-tint) 0 25%, var(--color-surface) 0 50%) 0 0 / 50% 50%",
      }}
    >
      {complete ? (
        <span className="absolute -right-px -top-px flex h-3 w-3 items-center justify-center bg-ink text-[8px] text-panel md:h-4 md:w-4 md:text-[10px]">
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
    <span className="font-mono text-[10px] text-muted">
      {total} {total === 1 ? "lesson" : "lessons"}
    </span>
  ) : (
    <div>
      <ProgressBar done={done} total={total} />
      <div className="mt-1 font-mono text-[10px] text-muted">
        {done} / {total} complete
      </div>
    </div>
  );

  return (
    <li>
      <Link
        href={`/learn/${track}`}
        className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 border border-ink p-2.5 transition-colors hover:bg-panel md:grid-cols-[44px_1fr_120px_auto] md:gap-4 md:px-[18px] md:py-4 ${
          inProgress ? "bg-panel" : ""
        } ${empty ? "opacity-50" : ""}`}
      >
        <Thumbnail empty={empty} complete={complete} />

        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[13px] font-semibold md:text-[15px]">{title}</span>
            {empty ? (
              <span className="font-mono text-[9px] tracking-[0.1em] text-muted">COMING SOON</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted md:text-xs">{description}</p>
          {progress !== null ? <div className="mt-2 md:hidden">{progress}</div> : null}
        </div>

        <div className="hidden md:block">{progress}</div>

        <span className="font-mono text-[11px]">
          {action !== null ? <span className="hidden md:inline">{action} </span> : null}→
        </span>
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
      <div className="border-b border-dashed border-hairline px-4 py-6 md:px-10 md:py-8">
        <div className="font-mono text-[10px] tracking-[0.14em] text-muted">LEARN</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em] md:text-3xl">Tracks</h1>
      </div>

      <div className="flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-10">
        <ProgressNotice progress={progress} />

        <ul className="flex flex-col gap-2 md:gap-2.5">
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
