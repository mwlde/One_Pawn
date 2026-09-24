import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Contact, Li, P, Ul } from "@/app/(legal)/LegalProse";

export const metadata: Metadata = {
  title: "About · One Pawn",
  description: "What One Pawn is, who builds it, and what it will not become.",
};

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-display text-xl font-medium">{children}</h2>;
}

export default function AboutPage() {
  return (
    <>
      <header className="border-b border-rule pb-6">
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl leading-tight">
          About One Pawn
        </h1>
      </header>

      <Heading>The project</Heading>
      <P>
        One Pawn is a chess learning and playing platform, designed to be helpful, adapted to you and a fun way to test your skills.
      </P>
      <P>The app currently consists of several features.</P>
      <Ul>
        <Li>Play: play chess against the computer, your classic chess game.</Li>
        <Li>
          Learn: learn how chess pieces move or, if you are more advanced, you can learn openings and
          tactics.
        </Li>
        <Li>
          Reinforce: learned material is most useful when it is retained in memory, so a smart
          repetition system of past learned content is added.
        </Li>
        <Li>
          Coach: when you want to play to learn and receive feedback on the way, you can play with
          the AI coach.
        </Li>
      </Ul>
      <P>
        The app is still under active development at a steady pace. Currently the focus is on
        polishing its functionality and adding in more content to the learning segment. Next, the
        focus will shift primarily on integrating the AI coach and after that the design part of the
        platform to make it aesthetically pleasing. Many more interesting social features are planned
        for the future, but first the general structure of the app has to be ensured.
      </P>

      <Heading>The developer</Heading>
      <P>
        One Pawn is built by MWLDE, a student and a developer exploring different aspects of the tech and gaming industry.
      </P>


      <Heading>Contact</Heading>
      <Ul>
        <Li>
          General inquiries: <Contact address="hello@mwlde.com" />
        </Li>
        <Li>
          Legal and privacy: <Contact address="legal@mwlde.com" />
        </Li>
      </Ul>
    </>
  );
}
