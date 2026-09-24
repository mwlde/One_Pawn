import Link from "next/link";

import { FOOTER_LINKS } from "@/components/ui/SiteFooter";
import { APP_STAGE, APP_VERSION } from "@/lib/version";

// The site footer is desktop only, so Profile carries the same links for mobile.
// Shown at every width so the page reads the same on both.
export function AboutAndLegal() {
  const year = new Date().getFullYear();

  return (
    <section className="mt-8 border-t border-rule pt-6">
      <h2 className="font-display text-xl font-medium">About and legal</h2>
      <ul className="mt-4 border-t border-rule">
        {FOOTER_LINKS.map((link) => (
          <li key={link.href} className="border-b border-rule">
            <Link
              href={link.href}
              className="block py-3 text-sm text-graphite transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        &copy; {year} One Pawn · v{APP_VERSION} · {APP_STAGE}
      </p>
    </section>
  );
}
