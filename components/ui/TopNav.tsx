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
import { useSessionUserId } from "@/components/SessionProvider";
import { HIGHLIGHTER } from "@/components/ui/highlighter";
import { MobileTabBar } from "@/components/ui/MobileTabBar";
import { createClient } from "@/lib/supabase/client";

type Tab = {
  label: string;
  href: string;
};

// Desktop tabs. Mobile has its own bar, MobileTabBar. The leave-game confirm
// that wireframe note F asks for is still not built, so on desktop any tab can
// pull a player out of a live game; on mobile /play hides the bar.
const TABS: readonly Tab[] = [
  { label: "Home", href: "/dashboard" },
  { label: "Play", href: "/play" },
  { label: "Learn", href: "/learn" },
  { label: "Reinforce", href: "/reinforce" },
  { label: "Profile", href: "/profile" },
];

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
    <span className="flex items-center gap-2 text-xs text-graphite">
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${isReady ? "bg-ink" : "bg-rule-strong"}`}
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
      // Desktop only. On mobile the Profile tab is the way in.
      <Link href="/login" className="hidden text-xs text-graphite transition-colors hover:text-ink md:inline">
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
        className="max-w-[9ch] truncate text-xs text-graphite sm:max-w-[22ch]"
      >
        {email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded border border-rule px-2 py-1 text-xs text-graphite transition-colors hover:border-rule-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
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
      className={`transition-colors ${active ? `font-medium text-ink ${HIGHLIGHTER}` : "text-graphite hover:text-ink"}`}
    >
      {tab.label}
    </Link>
  );
}

export function TopNav({ initialEmail }: { initialEmail: string | null }) {
  const pathname = usePathname();
  const { mobileNavHidden } = useNavChrome();
  const loggedIn = useSessionUserId() !== null;

  const mobileClass = mobileNavHidden ? "hidden md:flex" : "flex";

  return (
    <>
      <header
        className={`${mobileClass} h-11 shrink-0 items-center justify-between border-b border-rule px-4 md:h-14 md:px-6`}
      >
        <div className="flex items-center gap-8 text-sm">
          <Link href="/" className="font-display text-lg font-bold tracking-[-0.02em]">
            One Pawn
          </Link>
          {/* Desktop carries the tabs inline; mobile gets them along the bottom. */}
          <nav aria-label="Main" className="hidden gap-8 md:flex">
            {TABS.map((tab) => (
              <TabLabel key={tab.label} tab={tab} active={isActive(pathname, tab.href)} />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <EngineStatus />
          <AuthControl initialEmail={initialEmail} />
        </div>
      </header>

      <MobileTabBar loggedIn={loggedIn} hidden={mobileNavHidden} />
    </>
  );
}
