import type { Metadata } from "next";

import { Contact, DocHeader, Future, Li, P, Section, Ul } from "@/app/(legal)/LegalProse";

export const metadata: Metadata = {
  title: "Terms of Service · One Pawn",
  description: "The terms you agree to when you use One Pawn.",
};

// Adapted from open terms-of-service templates and rewritten for One Pawn. The
// numbering is stable: later versions should amend a section rather than
// renumber the document, so that "version 1.0, section 10" keeps its meaning.
export default function TermsPage() {
  return (
    <>
      <DocHeader title="Terms of Service" version="1.1" updated="7 September 2026" />

      <Section number={1} title="Acceptance of these terms">
        <P>
          One Pawn is a chess learning website. By creating an account or using the site, you
          agree to these terms. If you do not agree with them, please do not use One Pawn.
        </P>
        <P>
          One Pawn is currently a private preview. It is run by one person as a personal project,
          not by a registered company. It may be unavailable, incomplete, or changed without
          notice. Read section 9 before you rely on it for anything.
        </P>
      </Section>

      <Section number={2} title="What One Pawn is">
        <P>
          One Pawn lets you play chess in your browser against a chess engine that runs on your
          own device. If you create an account, your finished games are saved so that you can
          look at them again later.
        </P>
        <P>
          Other features are planned and are not part of the service today: guided lessons,
          spaced repetition practice, and an AI coach that comments on your games{" "}
          <Future>planned</Future>. Nothing in these terms is a promise that a planned feature
          will be built, or that it will work in a particular way if it is.
        </P>
      </Section>

      <Section number={3} title="Eligibility">
        <P>
          You must be at least 16 years old to use One Pawn. This applies everywhere, regardless
          of the age of consent where you live. When you register you confirm that you meet this
          requirement.
        </P>
        <P>
          If we find that an account belongs to somebody under 16, we will delete the account and
          the data attached to it. There is no appeal process for this in the current preview.
        </P>
      </Section>

      <Section number={4} title="Your account">
        <P>
          You need an email address and a password to create an account. Accounts are managed
          through Supabase, which stores your password as a hash. Nobody at One Pawn can read it.
        </P>
        <Ul>
          <Li>Give an accurate email address. It is the only way to reach you about your account.</Li>
          <Li>Keep your password to yourself. You are responsible for what happens under your account.</Li>
          <Li>
            Accounts are personal. One account is for one person, and you may not share it or pass
            it on to somebody else.
          </Li>
          <Li>Tell us at once if you think somebody else has got into your account.</Li>
        </Ul>
      </Section>

      <Section number={5} title="Acceptable use">
        <P>
          The rules below exist to keep a small project running for the people using it. Please do
          not:
        </P>
        <Ul>
          <Li>
            Scrape the site, or use bots, crawlers, or automated scripts to collect content or to
            create accounts.
          </Li>
          <Li>
            Reverse-engineer the chess engine in order to redistribute it. The compiled engine is
            delivered to your browser so that it can run there, which is the only licence you have
            to it. Reading it to understand how it works is fine. Repackaging it as your own, or
            shipping it in another product, is not.
          </Li>
          <Li>Share one account between several people, or resell access to an account.</Li>
          <Li>
            Use the AI coach for anything other than chess. It is there to talk about your games,
            not to act as a general-purpose assistant <Future>when the feature exists</Future>.
          </Li>
          <Li>
            Try to extract, recover, or interfere with the instructions given to the AI coach, or
            attempt to make it behave outside its intended purpose{" "}
            <Future>when the feature exists</Future>.
          </Li>
          <Li>
            Harass, abuse, or threaten another player through the play-a-friend feature{" "}
            <Future>when the feature exists</Future>.
          </Li>
          <Li>
            Attack the service or the people using it. That includes attempting to gain access to
            accounts or data that are not yours, probing for weaknesses beyond what our security
            policy permits, and deliberately overloading the site.
          </Li>
        </Ul>
        <P>
          If you have found a security problem, we would like to hear about it. See the contact
          page, or the security.txt file published at the root of the site.
        </P>
      </Section>

      <Section number={6} title="Who owns what">
        <P>
          One Pawn owns the site: the code, the chess engine, the design, the written content, and
          the name. None of that transfers to you by using the service.
        </P>
        <P>
          Your game data is yours. That means the games you play and save, and any progress
          records attached to your account. You keep every right you already have in it. You give
          One Pawn permission to store and process that data so that the service can show it back
          to you, and for no other purpose. We do not sell it, and we do not use it for
          advertising.
        </P>
        <P>
          Chess moves and positions are not owned by anybody. Nothing here is a claim over the
          game of chess.
        </P>
      </Section>

      <Section number={7} title="Changes to the service">
        <P>
          One Pawn is under active development. Features may be added, changed, or removed. During
          the preview this can happen without warning, and occasionally without a way back.
        </P>
        <P>
          If a change would delete data you have saved, we will tell you by email before it
          happens where we reasonably can.
        </P>
      </Section>

      <Section number={8} title="Ending the arrangement">
        <P>
          You can stop using One Pawn whenever you like. You can delete individual saved games
          from your profile page, and you can delete the account itself from the same page.
          Deletion is immediate: it removes your account and your saved games, there is no grace
          period, and it cannot be undone. Ask for a copy of anything you want to keep before you
          delete, not after. The privacy policy explains how.
        </P>
        <P>
          We can suspend or close an account that breaks these terms, that is being used to harm
          the service or other users, or that we are required to close by law. Where it is
          reasonable to do so, we will tell you why and give you a chance to put it right first.
          Serious cases, such as an attack on the service, do not get a warning.
        </P>
        <P>
          We may also close the service down entirely. If that happens, we will give at least 30
          days notice by email so that you can retrieve your data.
        </P>
      </Section>

      <Section number={9} title="No warranties">
        <P>
          One Pawn is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent
          the law allows, we make no warranties of any kind, whether express or implied, including
          any implied warranties of merchantability, fitness for a particular purpose, or
          non-infringement.
        </P>
        <P>
          In plain terms: we do not promise the site will be available, that it will be free of
          bugs, that your data will never be lost, or that the chess engine or any future coaching
          feature will be correct. This is a preview of a solo project. Please keep your own copy
          of anything that matters to you.
        </P>
      </Section>

      <Section number={10} title="Limitation of liability">
        <P>
          To the extent the law allows, One Pawn is not liable for any indirect, incidental,
          special, consequential, or exemplary damages. That includes lost profits, lost data,
          lost goodwill, and the cost of a substitute service, whether or not we were told such
          damages were possible.
        </P>
        <P>
          Where liability cannot be excluded, our total liability to you for all claims is limited
          to the amount you have paid to use One Pawn in the 12 months before the claim. One Pawn
          is free, so that amount is currently zero.
        </P>
        <P>
          Nothing in this section limits liability that cannot be limited by law, such as
          liability for death or personal injury caused by negligence, or for fraud.
        </P>
      </Section>

      <Section number={11} title="Indemnification">
        <P>
          If somebody brings a claim against One Pawn because of how you used the service, because
          you broke these terms, or because you infringed somebody else&apos;s rights, you agree to
          cover the resulting costs, including reasonable legal fees. We will tell you about any
          such claim and will not settle it without asking you first.
        </P>
      </Section>

      <Section number={12} title="Governing law">
        <P>
          These terms are governed by the laws of the United Arab Emirates, and the courts of the
          United Arab Emirates have jurisdiction over any dispute arising from them.
        </P>
        <P>
          That last paragraph does not take away rights you have where you live. If you are a
          consumer resident in the European Economic Area, the United Kingdom, or another country
          whose consumer protection law gives you mandatory rights, you keep those rights and you
          keep the right to bring a claim in the courts of the country you live in. Where the
          mandatory consumer law of your home country conflicts with these terms, that law wins.
        </P>
      </Section>

      <Section number={13} title="Changes to these terms">
        <P>
          We may update these terms. Every version carries a version number and a date at the top
          of this page.
        </P>
        <P>
          For material changes, meaning changes that meaningfully affect your rights or how your
          data is handled, we will give at least 30 days notice by email to the address on your
          account before the new version takes effect. Minor corrections, such as fixing a typo or
          clarifying wording that does not change its meaning, take effect when published.
        </P>
        <P>
          If you carry on using One Pawn after a change takes effect, that counts as accepting it.
          If you do not accept it, you can delete your account.
        </P>
      </Section>

      <Section number={14} title="Getting in touch">
        <P>
          For anything to do with these terms, write to <Contact address="legal@mwlde.com" />.
        </P>
        <P>
          For general inquiries and support, write to <Contact address="hello@mwlde.com" />.
        </P>
        <P>
          For security reports, write to <Contact address="hello@mwlde.com" /> instead.
        </P>
      </Section>
    </>
  );
}
