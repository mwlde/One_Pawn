"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/ui/SiteFooter";

// The app shell's footer. Everything under the (app) group gets one except the
// game screen, where the board is already competing for vertical space and a
// row of legal links would push it smaller.
//
// A denylist rather than an allowlist so screens added later inherit the footer
// without anyone having to remember to opt in. /play is the one exception, and
// the prefix match covers any sub-route it grows.
const FOOTERLESS_ROUTES: readonly string[] = ["/play"];

export function AppFooter() {
  const pathname = usePathname();

  const hidden = FOOTERLESS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return hidden ? null : <SiteFooter />;
}
