import { DemoBoard } from "@/components/board/DemoBoard";
import { HIGHLIGHTER } from "@/components/ui/highlighter";

// The left column of wireframe screen 04, shared by the landing page and the
// auth routes. Desktop only; mobile drops it, which is what the wireframe's own
// mobile note calls for and why the landing page carries a separate mobile hero.
//
// The wireframe fills this panel with a live grandmaster game. There is no
// spectating yet, and a faked one would be fake data on a production screen, so
// the panel leads with the product line and a real, movable demo board instead.
export function AuthPanel() {
  return (
    <div className="hidden items-center justify-center border-r border-rule p-8 md:flex lg:p-12">
      {/* Headline and board as one group, centred together: side by side once
          the column is wide enough for both at full size, stacked below that.
          At xl (1280px) the row squeezed the board to under 300px, smaller than
          it is stacked at 1180px, so the switch waits for 1440px. */}
      <div className="flex w-full flex-col items-center gap-8 min-[1440px]:flex-row min-[1440px]:justify-center min-[1440px]:gap-12">
        <div className="min-[1440px]:shrink-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">One Pawn</div>
          <p className="mt-4 max-w-[14ch] font-display text-4xl font-bold leading-[1.1] tracking-[-0.02em]">
            Play a real engine in your browser. Learn from{" "}
            <span className="whitespace-nowrap">
              <span className={`${HIGHLIGHTER} inline-block box-decoration-clone leading-none`}>every&nbsp;game</span>.
            </span>
          </p>
        </div>

        <div className="w-full min-w-0 max-w-[420px]">
          <DemoBoard />
        </div>
      </div>
    </div>
  );
}
