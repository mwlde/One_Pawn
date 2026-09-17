"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Switching back to a tab usually fires both visibilitychange and focus. One
// refresh answers both.
const MIN_GAP_MS = 2000;

// The hub is a server component, so refetching the queue means re-rendering
// it: router.refresh() does that without losing client state or scroll. A tab
// left open while reviews happen elsewhere shows the new queue on return.
export function RefreshOnFocus() {
  const router = useRouter();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < MIN_GAP_MS) return;
      lastRefreshRef.current = now;
      router.refresh();
    }

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  return null;
}
