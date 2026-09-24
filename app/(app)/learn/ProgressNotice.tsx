import Link from "next/link";

import type { ProgressRead } from "@/lib/lessons/completions";

// Why no progress is showing, when none is. Same weight as the save line on the
// lesson complete screen: a note, not a banner.
export function ProgressNotice({ progress }: { progress: ProgressRead }) {
  if (progress.status === "logged_out") {
    return (
      <p className="text-xs leading-relaxed text-graphite">
        <Link href="/login" className="text-info-text underline underline-offset-2 transition-colors hover:text-ink">
          Log in
        </Link>{" "}
        to track your progress.
      </p>
    );
  }

  if (progress.status === "failed") {
    return (
      <p className="text-xs leading-relaxed text-graphite">
        Your progress could not be loaded. Refresh the page to try again.
      </p>
    );
  }

  return null;
}
