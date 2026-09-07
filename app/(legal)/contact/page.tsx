import type { Metadata } from "next";

import { Contact, DocHeader, Li, P, Section, Ul } from "@/app/(legal)/LegalProse";

export const metadata: Metadata = {
  title: "Contact and Legal Notice · One Pawn",
  description: "Who runs One Pawn and how to get in touch.",
};

// Serves as the Impressum that German-speaking jurisdictions expect, and as an
// ordinary contact page everywhere else. Email only: no physical address is
// published, because there is no business premises to publish.
export default function ContactPage() {
  return (
    <>
      <DocHeader title="Contact and Legal Notice" version="1.1" updated="7 September 2026" />

      <Section number={1} title="Who is responsible for this site">
        <P>
          One Pawn is built and run by mwlde. It is a personal project and a portfolio piece. It
          is not a registered business, not a company, and has no employees.
        </P>
        <P>
          The operator&apos;s full name and contact details are available on request to{" "}
          <Contact address="legal@mwlde.com" />, and to any authority entitled to ask. Publishing a
          handle here rather than a legal name is a privacy choice by an individual running a small
          project, not an attempt to be unreachable.
        </P>
        <P>
          Saying so plainly is the point of this page. One Pawn is a solo project in a private
          preview. Please judge what it promises accordingly.
        </P>
      </Section>

      <Section number={2} title="How to get in touch">
        <Ul>
          <Li>
            <strong>General inquiries and support:</strong> <Contact address="hello@mwlde.com" />.
            Use this if something is broken, if you are stuck, or if you want to ask about the
            project. It is the right address when none of the others obviously fit.
          </Li>
          <Li>
            <strong>Legal and privacy:</strong> <Contact address="legal@mwlde.com" />. Use this for
            anything about the terms, the privacy policy, or a request about your own data.
          </Li>
          <Li>
            <strong>Security disclosure:</strong> <Contact address="security@mwlde.com" />. Use
            this to report a vulnerability. Machine-readable details are published at{" "}
            <a href="/.well-known/security.txt" className="font-mono text-[13px] underline hover:text-muted">
              /.well-known/security.txt
            </a>
            .
          </Li>
        </Ul>
        <P>
          Email is the only support channel. Expect a reply within a few days, and within 30 days
          at the latest for a formal data request.
        </P>
      </Section>

      <Section number={3} title="Postal address">
        <P>
          None is published. One Pawn is operated by an individual rather than a business, and
          publishing a home address is not a reasonable thing to ask of one. If a jurisdiction we
          serve turns out to require a postal address for a service like this, a business mailing
          address will be arranged and listed here.
        </P>
      </Section>

      <Section number={4} title="The documents">
        <Ul>
          <Li>
            <a href="/terms" className="underline hover:text-muted">
              Terms of Service
            </a>{" "}
            covers what you agree to by using the site.
          </Li>
          <Li>
            <a href="/privacy" className="underline hover:text-muted">
              Privacy Policy
            </a>{" "}
            covers what data is collected and what you can do about it. The cookie policy is
            section 12 of that document.
          </Li>
        </Ul>
      </Section>
    </>
  );
}
