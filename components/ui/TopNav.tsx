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
  href: string | null;
};

// Learn and Reinforce are rendered but inert rather than pointed at "coming
// soon" pages: a disabled tab matches the wireframe's muted styling, avoids two
// dead-end routes, and sidesteps the leave-game confirm that wireframe note F
// requires before navigation can pull a player out of a live game. They become
// links when their phases land.
const TABS: readonly Tab[] = [
  { label: "Play", href: "/play" },
  { label: "Learn", href: null },
  { label: "Reinforce", href: null },
  { label: "Profile", href: "/profile" },
];

// A tab owns its subtree, so /profile/games/<id> keeps Profile marked as the
// current page. The trailing slash matters: without it /profiles would match.
function isActive(pathname: string, href: string | null): boolean {
  if (href === null) return false;
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
  if (tab.href === null) {
    return (
      <span aria-disabled="true" title="Coming soon" className="cursor-not-allowed text-hairline">
        {tab.label}
      </span>
    );
  }

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

      <nav
        aria-label="Main"
        className={`${mobileNavHidden ? "hidden" : "grid"} order-last shrink-0 grid-cols-4 border-t border-ink text-center font-mono text-[10px] md:hidden`}
      >
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          if (tab.href === null) {
            return (
              <span
                key={tab.label}
                aria-disabled="true"
                className="cursor-not-allowed py-3 text-hairline"
              >
                {tab.label}
              </span>
            );
          }
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`py-3 ${active ? "bg-ink text-panel" : "text-muted"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
