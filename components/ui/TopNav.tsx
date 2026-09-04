"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useEngineContext } from "@/components/EngineProvider";

type Tab = {
  label: string;
  href: string | null;
};

// Only Play routes anywhere this session. The other three are rendered but
// inert rather than pointed at "coming soon" pages: a disabled tab matches the
// wireframe's muted styling, avoids three dead-end routes, and sidesteps the
// leave-game confirm that wireframe note F requires before navigation can pull
// a player out of a live game. They become links when their phases land.
const TABS: readonly Tab[] = [
  { label: "Play", href: "/play" },
  { label: "Learn", href: null },
  { label: "Reinforce", href: null },
  { label: "Profile", href: null },
];

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

export function TopNav() {
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
              <TabLabel key={tab.label} tab={tab} active={pathname === tab.href} />
            ))}
          </nav>
        </div>
        <EngineStatus />
      </header>

      <nav
        aria-label="Main"
        className={`${mobileNavHidden ? "hidden" : "grid"} order-last shrink-0 grid-cols-4 border-t border-ink text-center font-mono text-[10px] md:hidden`}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
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
