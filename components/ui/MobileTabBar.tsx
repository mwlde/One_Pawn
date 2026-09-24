"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HIGHLIGHTER } from "@/components/ui/highlighter";

// The only navigation on mobile, on every page. The top bar is desktop only, so
// the tabs stay in one place instead of jumping between the top of the
// logged-out pages and the bottom of the app.

type MobileTab = {
  label: string;
  href: string;
  // Extra routes that mark this tab as the current page.
  alsoActiveOn?: readonly string[];
};

// Signed in, Home is the dashboard and Profile is the profile. Signed out, Home
// is the landing page and Profile is the way in. Where the session is not known
// (the static pages outside the app shell), "/" and "/profile" route themselves:
// the landing page sends a signed-in visitor to the dashboard, and the profile
// sends a guest to log in.
function tabsFor(loggedIn: boolean | null): readonly MobileTab[] {
  return [
    loggedIn === true
      ? { label: "Home", href: "/dashboard" }
      : { label: "Home", href: "/", alsoActiveOn: ["/dashboard"] },
    { label: "Play", href: "/play" },
    { label: "Learn", href: "/learn" },
    { label: "Reinforce", href: "/reinforce" },
    loggedIn === false
      ? { label: "Profile", href: "/login", alsoActiveOn: ["/register", "/profile"] }
      : { label: "Profile", href: "/profile", alsoActiveOn: ["/login", "/register"] },
  ];
}

// The bar is fixed to the viewport, so it occupies no space in the page's column
// and a spacer has to stand in for it at the end of the page. Both read this
// height, so they cannot drift apart: 2.75rem of tabs, a comfortable tap
// target, plus the device's bottom safe area (the home indicator), which the
// bar pads itself by so the tabs sit above it.
const MOBILE_NAV_HEIGHT = "h-[calc(2.75rem+env(safe-area-inset-bottom))]";

// The same height as an offset, for a screen that sticks something to the
// bottom of the viewport and would otherwise stick it underneath the bar.
// Exported as a class rather than a number because Tailwind has to see the
// finished utility name to emit it.
export const MOBILE_NAV_CLEARANCE = "bottom-[calc(2.75rem+env(safe-area-inset-bottom))]";

// A tab owns its subtree, so /profile/games/<id> keeps Profile marked as the
// current page. The trailing slash matters: without it /profiles would match.
// "/" matches only itself, or it would own every route.
function matches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, tab: MobileTab): boolean {
  return [tab.href, ...(tab.alsoActiveOn ?? [])].some((href) => matches(pathname, href));
}

export function MobileTabBar({
  loggedIn = null,
  hidden = false,
}: {
  loggedIn?: boolean | null;
  hidden?: boolean;
}) {
  const pathname = usePathname();

  if (hidden) return null;

  return (
    <>
      {/* Fixed rather than at the end of the column, so on a page taller than
          the screen the tabs stay where a thumb expects them.

          z-10 puts it over page content but under the post-game sheet at z-20,
          which covers the screen on purpose. */}
      <nav
        aria-label="Main"
        className={`fixed inset-x-0 bottom-0 z-10 grid ${MOBILE_NAV_HEIGHT} grid-cols-5 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] text-center text-xs md:hidden`}
      >
        {tabsFor(loggedIn).map((tab) => {
          const active = isActive(pathname, tab);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center ${active ? "font-medium text-ink" : "text-graphite"}`}
            >
              {/* The flex parent makes this span a block as tall as its line
                  box, and the band's stops are percentages of that height.
                  With the default text-xs leading the band slid under the
                  baseline; leading-none fits the box to the letters so it
                  covers their lower part, as on desktop. */}
              <span className={active ? `${HIGHLIGHTER} leading-none` : undefined}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* The height the fixed bar does not take in the column. Ordered last so
          it lands at the end of the page wherever the bar is rendered. */}
      <div aria-hidden className={`order-last shrink-0 ${MOBILE_NAV_HEIGHT} md:hidden`} />
    </>
  );
}
