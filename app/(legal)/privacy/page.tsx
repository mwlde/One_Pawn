import type { Metadata } from "next";

import { Code, Contact, DocHeader, Future, Li, P, Section, Ul } from "@/app/(legal)/LegalProse";

export const metadata: Metadata = {
  title: "Privacy Policy · One Pawn",
  description: "What data One Pawn collects, why, and what you can do about it.",
};

// Adapted from open privacy-policy templates and rewritten for One Pawn. The
// cookie policy is section 10 rather than a page of its own: One Pawn sets one
// essential cookie and nothing else, which is not enough to fill a document.
export default function PrivacyPage() {
  return (
    <>
      <DocHeader title="Privacy Policy" version="1.1" updated="7 September 2026" />

      <Section number={1} title="The short version">
        <P>
          One Pawn collects as little as it can. To have an account you need to give an email
          address and a password. Everything else stored about you is the chess you have played.
          There is no advertising, no tracking, and no analytics. Your data is not sold and not
          shared with anybody except the two providers needed to run the site.
        </P>
      </Section>

      <Section number={2} title="Who is responsible for your data">
        <P>
          One Pawn is the data controller for the data described here. One Pawn is a personal
          project run by mwlde, not a registered company. Contact:{" "}
          <Contact address="legal@mwlde.com" />.
        </P>
        <P>
          The operator&apos;s full name and contact details are available on request to{" "}
          <Contact address="legal@mwlde.com" />, and to any supervisory authority that asks.
        </P>
      </Section>

      <Section number={3} title="What is collected">
        <Ul>
          <Li>
            <strong>Email address.</strong> Given by you when you register.
          </Li>
          <Li>
            <strong>Password.</strong> Stored only as a hash by Supabase, our authentication
            provider. It is never stored in a readable form and cannot be recovered, only reset.
          </Li>
          <Li>
            <strong>Game history.</strong> The games you finish while logged in: the moves, the
            result, the settings the game was played at, and when it was played.
          </Li>
          <Li>
            <strong>Technical data.</strong> Our hosting and authentication providers process
            connection data such as IP addresses and browser user-agent strings in order to serve
            the site and to block abuse. One Pawn does not build profiles from it and does not
            keep its own copy.
          </Li>
          <Li>
            <strong>Learn progress.</strong> Which lessons and practice items you have worked
            through, and when they are next due <Future>planned</Future>.
          </Li>
          <Li>
            <strong>Coach usage.</strong> A count of how often you have asked the AI coach for
            comment, kept so that fair usage limits can be applied, plus a record of each request
            for debugging and abuse handling <Future>planned</Future>.
          </Li>
        </Ul>
        <P>
          If you play without an account, nothing is saved. The game lives in your browser and is
          gone when you leave.
        </P>
      </Section>

      <Section number={4} title="Why each category is collected">
        <Ul>
          <Li>
            <strong>Email and password:</strong> to create your account, to sign you in, to
            confirm the address is real, and to let you reset your password. Your email is also
            how we would reach you about a material change to this policy or to the terms.
          </Li>
          <Li>
            <strong>Game history:</strong> so that you can look at your own past games. It is
            shown to you and to nobody else.
          </Li>
          <Li>
            <strong>Technical data:</strong> to deliver the site and to keep it available, which
            includes rate limiting and blocking attacks.
          </Li>
          <Li>
            <strong>Learn progress:</strong> to schedule practice and show you how far you have
            got <Future>planned</Future>.
          </Li>
          <Li>
            <strong>Coach usage:</strong> to apply fair usage limits and to keep the feature
            working and affordable <Future>planned</Future>.
          </Li>
        </Ul>
      </Section>

      <Section number={5} title="Legal basis for processing">
        <P>
          One Pawn is run from the United Arab Emirates. The GDPR still applies to users in the
          European Economic Area, because the service is offered to people there, so the bases
          below are given in GDPR terms.
        </P>
        <Ul>
          <Li>
            <strong>Performance of a contract</strong> (Article 6(1)(b)) for your account, signing
            you in, and saving your games. These are the service you asked for.
          </Li>
          <Li>
            <strong>Legitimate interests</strong> (Article 6(1)(f)) for the technical data used to
            keep the site available and to prevent abuse. The interest is running a working
            service without it being knocked over.
          </Li>
        </Ul>
        <P>
          There is no processing based on consent today, because there is nothing optional to
          consent to. If that changes, this policy changes with it and you will be asked first.
        </P>
      </Section>

      <Section number={6} title="How long it is kept">
        <P>
          While your account exists, your account data and game history are kept indefinitely. The
          point of saved games is that they are still there next year.
        </P>
        <P>
          When you delete your account, your account record and your saved games are deleted
          with it. This happens immediately, at the moment you confirm it, and there is no grace
          period in which it could be undone. Backups held by our providers may keep copies for a
          short period afterwards before they roll over. Technical logs held by the hosting and
          authentication providers expire on their own schedules and are not under our control
          beyond what those providers offer.
        </P>
      </Section>

      <Section number={7} title="Who your data is shared with">
        <P>
          Your data is not sold, rented, or shared for advertising. It is handled by the following
          processors, each of which does one job:
        </P>
        <Ul>
          <Li>
            <strong>Supabase.</strong> Authentication and database. It stores your email, your
            hashed password, and your saved games.
          </Li>
          <Li>
            <strong>Cloudflare.</strong> Hosting and content delivery. It serves the site to your
            browser and processes connection data in doing so.
          </Li>
          <Li>
            <strong>Anthropic.</strong> The AI coach would send the position and moves being
            discussed to Anthropic&apos;s API to generate the comment. Your email address and
            account identity would not be sent <Future>planned</Future>.
          </Li>
        </Ul>
        <P>
          We may also disclose data where the law requires it. Given the size of this project,
          that has never happened.
        </P>
      </Section>

      <Section number={8} title="International transfers">
        <P>
          Supabase and Cloudflare operate in several regions, including the United States and the
          European Union. Cloudflare serves the site from whichever location is nearest to you, so
          your connection data may be processed outside your own country. This means personal data
          may be transferred out of the European Economic Area.
        </P>
        <P>
          Both providers offer data processing terms that include the European Commission&apos;s
          standard contractual clauses for such transfers. If the AI coach is built, the same
          question will apply to Anthropic and will be addressed in an updated version of this
          policy before the feature goes live.
        </P>
      </Section>

      <Section number={9} title="Your rights">
        <P>If you are in the EEA or the UK, you have the following rights. We honour them for everyone, wherever you live.</P>
        <Ul>
          <Li>
            <strong>Access.</strong> Ask what data is held about you and get a copy.
          </Li>
          <Li>
            <strong>Rectification.</strong> Ask for anything inaccurate to be corrected.
          </Li>
          <Li>
            <strong>Erasure.</strong> Delete your account and its data yourself, from your
            profile page. You can also delete individual saved games there.
          </Li>
          <Li>
            <strong>Portability.</strong> Ask for your data in a machine-readable format.
          </Li>
          <Li>
            <strong>Objection.</strong> Object to processing based on legitimate interests.
          </Li>
          <Li>
            <strong>Restriction.</strong> Ask us to hold processing while a dispute about accuracy
            or lawfulness is sorted out.
          </Li>
          <Li>
            <strong>Complaint.</strong> Complain to your local data protection supervisory
            authority. In the EEA that is the authority for the country you live in.
          </Li>
        </Ul>
      </Section>

      <Section number={10} title="How to use those rights">
        <P>
          Email <Contact address="legal@mwlde.com" /> from the address on your account. We will
          reply within 30 days.
        </P>
        <P>
          Erasure does not need an email. You can delete your account from your profile at any
          time. Deletion is immediate and cannot be undone. All associated data including games is
          permanently removed. You can also delete a single saved game from the games list on the
          same page.
        </P>
        <P>
          The other requests are handled by hand in the current preview. There is no export button
          yet: ask by email and your data will be sent to you as a file within the 30 days above.
          If you want a copy of your games, ask for it before you delete the account, because
          afterwards there is nothing left to send.
        </P>
      </Section>

      <Section number={11} title="Children">
        <P>
          One Pawn is for people aged 16 and over. It is not aimed at children and it does not
          knowingly collect data from anybody under 16. If we learn that an account belongs to
          somebody under 16, the account and its data are deleted.
        </P>
        <P>
          If you are a parent or guardian and believe your child has made an account, write to{" "}
          <Contact address="legal@mwlde.com" /> and it will be removed.
        </P>
      </Section>

      <Section number={12} title="Cookies">
        <P>
          One Pawn sets one kind of cookie, and it is strictly necessary for the site to work:
        </P>
        <Ul>
          <Li>
            <strong>Session cookies (Supabase Auth), named <Code>sb-</Code> followed by the project
            identifier.</strong> Set when you log in. They hold the token that keeps you signed in
            as you move between pages. Without them you would be logged out on every click. They
            are cleared when you log out.
          </Li>
          <Li>
            <strong>
              <Code>onepawn_returning</Code>.
            </strong>{" "}
            Set the first time you sign in on a device, and it stores nothing but the fact that
            somebody has. It lets the login page say &ldquo;Welcome back&rdquo; to a returning
            visitor instead of greeting them as new. It holds no email address and no identifier,
            so it cannot be used to recognise <em>who</em> you are, only that this browser has been
            used to sign in before.
          </Li>
        </Ul>
        <P>
          No other cookies are set. There are no advertising cookies, no tracking cookies, and no
          third-party cookies. Both cookies above are strictly necessary for a service you asked
          for, so no consent banner is required and none is shown.
        </P>
      </Section>

      <Section number={13} title="Analytics">
        <P>
          One Pawn runs no analytics at all. There is no Google Analytics, no tag manager, no
          pixels, and no third-party scripts measuring what you do on the site.
        </P>
        <P>
          This may change. If analytics are added, they will be a privacy-respecting,
          cookie-free tool such as Plausible or Fathom, which count page views without identifying
          individual visitors. This policy will be updated to say so before any such tool is
          switched on, not afterwards.
        </P>
      </Section>

      <Section number={14} title="Security">
        <P>
          Passwords are hashed by Supabase and never stored in readable form. Database access is
          restricted by row level security policies, so one account cannot read another
          account&apos;s data. Traffic is served over HTTPS.
        </P>
        <P>
          No system is perfectly secure, and this one is maintained by one person. If you find a
          weakness, please report it to <Contact address="hello@mwlde.com" />.
        </P>
      </Section>

      <Section number={15} title="Changes to this policy">
        <P>
          This policy carries a version number and a date at the top. For material changes, meaning
          a new category of data, a new recipient, or a new purpose, we will email the address on
          your account at least 30 days before the change takes effect. Minor edits that do not
          change the meaning take effect when published.
        </P>
      </Section>

      <Section number={16} title="Getting in touch">
        <P>
          For any privacy question, or to use any of the rights in section 9, write to{" "}
          <Contact address="legal@mwlde.com" />.
        </P>
        <P>
          For general inquiries and support, including anything that is simply not working, write
          to <Contact address="hello@mwlde.com" /> instead.
        </P>
      </Section>
    </>
  );
}
