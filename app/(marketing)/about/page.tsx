import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Contact, Li, P, Ul } from "@/app/(legal)/LegalProse";

export const metadata: Metadata = {
  title: "About · One Pawn",
  description: "What One Pawn is, who builds it, and what it will not become.",
};

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 text-lg font-semibold tracking-[-0.01em]">{children}</h2>;
}

// Marks text Maria has not written yet. Loud on purpose, so none of it can ship
// unnoticed. Search the repo for "TODO: replace" to find every one.
function Todo({ children }: { children: ReactNode }) {
  return (
    <span className="border border-dashed border-ink bg-tint px-1 font-mono text-[13px]">
      [TODO: replace with real text] {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <>
      <header className="border-b border-ink pb-6">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.01em] md:text-[40px]">
          About One Pawn
        </h1>
      </header>

      <Heading>The project</Heading>
      <P>
        <Todo>One Pawn is [WHAT IT IS]. It exists because [WHY].</Todo>
      </P>
      <P>
        <Todo>[HOW IT WORKS: play, Learn, Reinforce, in a sentence or two.]</Todo>
      </P>
      <P>
        <Todo>[WHERE IT IS HEADED.]</Todo>
      </P>

      <Heading>The developer</Heading>
      <P>
        <Todo>One Pawn is built by [NAME], a [WHO]. [WHY THEY MADE IT].</Todo>
      </P>

      <Heading>What One Pawn is not</Heading>
      <Ul>
        <Li>
          <strong>Focused, not gamified.</strong> No streaks, no daily rewards, no trophies.
          Progress is shown through data.
        </Li>
        <Li>
          <strong>Honest, not encouraging.</strong> When you make a mistake, One Pawn tells you,
          and tells you why, without softening it.
        </Li>
        <Li>
          <strong>Structured, not open-ended.</strong> Every lesson has clear criteria for
          completion, and you always know where you are in a track.
        </Li>
        <Li>
          <strong>Adult, not childlike.</strong> The design and the copy treat you as a capable
          learner.
        </Li>
      </Ul>

      <Heading>Contact</Heading>
      <Ul>
        <Li>
          General inquiries: <Contact address="hello@mwlde.com" />
        </Li>
        <Li>
          Legal and privacy: <Contact address="legal@mwlde.com" />
        </Li>
        <Li>
          Security disclosure: <Contact address="security@mwlde.com" />
        </Li>
      </Ul>
    </>
  );
}
