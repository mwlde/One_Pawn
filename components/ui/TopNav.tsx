"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useEngineContext } from "@/components/EngineProvider";
import { createClient } from "@/lib/supabase/client";

type Tab = {
  label: string;
  href: string;
};

// The leave-game confirm that wireframe note F asks for is still not built, so
// on desktop any tab can pull a player out of a live game; on mobile /play
// hides this bar.
const TABS: readonly Tab[] = [
  { label: "Home", href: "/dashboard" },
  { label: "Play", href: "/play" },
  { label: "Learn", href: "/learn" },
  { label: "Reinforce", href: "/reinforce" },
  { label: "Profile", href: "/profile" },
];

// The mobile tab bar is fixed to the viewport, so it occupies no space in the
// shell's column and a spacer has to stand in for it at the end of the page.
// Both read this height, so they cannot drift apart. It matches the mobile
// header's own h-11, which is also a comfortable tap target.
const MOBILE_NAV_HEIGHT = "h-11";

// The same height as an offset, for a screen that sticks something to the
// bottom of the viewport and would otherwise stick it underneath the bar.
// Exported as a class rather than a number because Tailwind has to see the
// finished utility name to emit it.
export const MOBILE_NAV_CLEARANCE = "bottom-11";

// A tab owns its subtree, so /profile/games/<id> keeps Profile marked as the
// current page. The trailing slash matters: without it /profiles would match.
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavChromeValue = {
  mobileNavHidden: boolean;
  setMobileNavHidden: (hidden: boolean) => void;
};

const NavChromeContext = createContext<NavChromeValue | null>(null);

export function NavChromeProvider({ children }: { children: ReactNode }) {
  const [mobileNavHidden, setMobileNavHidden] = useState(false);
  const value = useMemo(
    () => ({ mobileNavHidden, setMobileNavHidden }),
    [mobileNavHidden],
  );

  return <NavChromeContext.Provider value={value}>{children}</NavChromeContext.Provider>;
}

function useNavChrome(): NavChromeValue {
  const value = useContext(NavChromeContext);
  if (value === null) {
    throw new Error("Nav chrome hooks must be used inside a NavChromeProvider.");
  }
  return value;
}

// Mobile only. A screen that supplies its own in-context header calls this to
// stand the shell's mobile chrome down for as long as it is mounted. The
// wireframe's system notes put the bottom tab bar on Learn and Profile but an
// in-context header on Play, because a stray tap on a tab mid-game costs the
// player the game. Desktop keeps its tabs throughout, per screen 02.
export function useHideMobileNav(active: boolean): void {
  const { setMobileNavHidden } = useNavChrome();

  useEffect(() => {
    setMobileNavHidden(active);
    return () => setMobileNavHidden(false);
  }, [active, setMobileNavHidden]);
}

function EngineStatus() {
  const { isReady } = useEngineContext();

  return (
    <span className="flex items-center gap-2 font-mono text-[11px] text-muted">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 ${isReady ? "bg-ink" : "bg-hairline"}`}
      />
      {isReady ? "Engine ready" : "Engine loading..."}
    </span>
  );
}

// Seeded from the session the server layout already read, so the first paint
// is correct rather than flashing "Log in" at someone who is logged in.
// onAuthStateChange then keeps it honest for the rest of the tab's life: a log
// out in this tab, a token refresh, or an expiry all arrive here as an event.
function useAuthEmail(initialEmail: string | null): string | null {
  const [email, setEmail] = useState(initialEmail);
  const [lastInitialEmail, setLastInitialEmail] = useState(initialEmail);

  // Adjusted during render rather than in an effect, which is React's own
  // recommendation for following a prop. It matters for the cross-tab case:
  // logging in elsewhere fires no event in this tab, so the only signal is the
  // server layout re-rendering with a different email on the next navigation.
  if (initialEmail !== lastInitialEmail) {
    setLastInitialEmail(initialEmail);
    setEmail(initialEmail);
  }

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return email;
}

function AuthControl({ initialEmail }: { initialEmail: string | null }) {
  const email = useAuthEmail(initialEmail);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (email === null) {
    return (
      <Link href="/login" className="font-mono text-[11px] text-muted hover:text-ink">
        Log in
      </Link>
    );
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // refresh() re-runs the server layout, which drops the session it read.
    // Without it the page keeps rendering against a session that is now gone.
    router.refresh();
    setSigningOut(false);
  }

  return (
    <div className="flex items-center gap-2">
      <span
        title={email}
        className="max-w-[9ch] truncate font-mono text-[11px] text-muted sm:max-w-[22ch]"
      >
        {email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="border border-hairline px-2 py-1 font-mono text-[10px] text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        Log out
      </button>
    </div>
  );
}

function TabLabel({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={active ? "font-semibold text-ink" : "text-muted hover:text-ink"}
    >
      {tab.label}
    </Link>
  );
}

export function TopNav({ initialEmail }: { initialEmail: string | null }) {
  const pathname = usePathname();
  const { mobileNavHidden } = useNavChrome();

  const mobileClass = mobileNavHidden ? "hidden md:flex" : "flex";

  return (
    <>
      <header
        className={`${mobileClass} h-11 shrink-0 items-center justify-between border-b border-dashed border-hairline px-4 md:h-14 md:px-6`}
      >
        <div className="flex items-center gap-7 text-[13px]">
          <Link href="/" className="font-mono text-sm font-semibold">
            One Pawn
          </Link>
          {/* Desktop carries the tabs inline; mobile gets them along the bottom. */}
          <nav aria-label="Main" className="hidden gap-7 md:flex">
            {TABS.map((tab) => (
              <TabLabel key={tab.label} tab={tab} active={isActive(pathname, tab.href)} />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <EngineStatus />
          <AuthControl initialEmail={initialEmail} />
        </div>
      </header>

      {/* Fixed to the bottom of the viewport rather than placed at the end of
          the column. In flow it was the last thing on the page, so on anything
          taller than the screen (Profile with a full games table, a lesson) it
          sat below the footer and could only be reached by scrolling to the
          very bottom. Fixed, the page scrolls underneath it and the tabs are
          always where a thumb expects them.

          z-10 puts it over page content but under the post-game sheet at z-20,
          which covers the screen on purpose. */}
      <nav
        aria-label="Main"
        className={`${mobileNavHidden ? "hidden" : "grid"} fixed inset-x-0 bottom-0 z-10 ${MOBILE_NAV_HEIGHT} grid-cols-5 border-t border-ink bg-surface text-center font-mono text-[10px] md:hidden`}
      >
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-center ${active ? "bg-ink text-panel" : "text-muted"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* The height the fixed bar no longer takes in the column. Without it the
          bar covers the last rows of whatever the page ends with, which on
          Profile is the footer and the delete-account section above it. */}
      {mobileNavHidden ? null : (
        <div aria-hidden className={`order-last shrink-0 ${MOBILE_NAV_HEIGHT} md:hidden`} />
      )}
    </>
  );
}
