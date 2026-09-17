import Link from "next/link";

import type { ProgressRead } from "@/lib/lessons/completions";

// Why no progress is showing, when none is. Same weight as the save line on the
// lesson complete screen: a note, not a banner.
export function ProgressNotice({ progress }: { progress: ProgressRead }) {
  if (progress.status === "logged_out") {
    return (
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        <Link href="/login" className="underline underline-offset-2 hover:text-ink">
          Log in
        </Link>{" "}
        to track your progress.
      </p>
    );
  }

  if (progress.status === "failed") {
    return (
      <p className="font-mono text-[10px] leading-relaxed text-muted">
        Your progress could not be loaded. Refresh the page to try again.
      </p>
    );
  }

  return null;
}
