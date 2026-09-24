import type { ReactNode } from "react";

import { AuthPanel } from "@/app/(auth)/AuthPanel";
import { MobileTabBar } from "@/components/ui/MobileTabBar";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";

// Wireframe 04: split at 1fr / 520px on desktop, narrowed to 440px below lg so
// the board column keeps a usable width on a small window (the 360px form plus
// padding still fits). Mobile (04m) drops the left
// panel and lets the form fill the viewport.
//
// The full site header sits at the top rather than a bare logo, so the
// navigation is present on the log in and register screens the same way it is
// on the landing page. The auth screens still render no app nav and no engine:
// nothing here needs the chess engine, and downloading the WASM module on the
// login screen would be waste.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <MobileTabBar />

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_440px] lg:grid-cols-[minmax(0,1fr)_520px]">
        <AuthPanel />

        <div className="flex flex-col p-6 md:p-10 lg:p-12">
          <div className="flex flex-1 flex-col justify-center md:justify-start">{children}</div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
