"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The landing page and the log in / register screens carry their own way in, so
// a second "Log in" in the header there only competes with it. Every other page
// that uses the site header keeps the link.
const ROUTES_WITH_OWN_LOGIN: readonly string[] = ["/", "/login", "/register"];

export function LogInLink() {
  const pathname = usePathname();

  if (ROUTES_WITH_OWN_LOGIN.includes(pathname)) return null;

  return (
    <Link href="/login" className="text-xs text-graphite transition-colors hover:text-ink">
      Log in
    </Link>
  );
}
