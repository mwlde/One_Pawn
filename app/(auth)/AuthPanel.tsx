import { DemoBoard } from "@/components/board/DemoBoard";

// The left column of wireframe screen 04, shared by the landing page and the
// auth routes. Desktop only; mobile drops it, which is what the wireframe's own
// mobile note calls for and why the landing page carries a separate mobile hero.
//
// The wireframe fills this panel with a live grandmaster game. There is no
// spectating yet, and a faked one would be fake data on a production screen, so
// the panel leads with the product line and a real, movable demo board instead.
export function AuthPanel() {
  return (
    <div className="hidden flex-col gap-8 border-r border-ink p-12 md:flex">
      <div>
        <div className="font-mono text-[11px] tracking-[0.1em] text-muted">ONE PAWN</div>
        <p className="mt-4 max-w-[14ch] text-3xl font-bold leading-[1.1] tracking-tight">
          Play a real engine in your browser. Learn from every game.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-[420px]">
          <DemoBoard />
        </div>
      </div>
    </div>
  );
}
