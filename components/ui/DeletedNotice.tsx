"use client";

import { useSearchParams } from "next/navigation";

// The account deletion redirect's confirmation, read from the query string in
// the browser rather than from the page's searchParams. Awaiting searchParams
// in the landing page would opt the whole route out of prerendering, and the
// front door should not be server-rendered on every visit for a message a user
// sees once. Under a Suspense boundary this keeps the page static.
//
// Nothing is stored: the message is on the URL, so navigating anywhere else is
// the whole of the dismissal.
export function DeletedNotice() {
  const deleted = useSearchParams().get("deleted");
  if (deleted !== "true") return null;

  return (
    <p role="status" className="mb-8 border border-ink px-4 py-3 font-mono text-xs leading-relaxed">
      Your account has been deleted.
    </p>
  );
}
