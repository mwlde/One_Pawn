// Where to send someone after they log in. A logged-out visitor who asked for a
// profile route is bounced to /login, and the route they wanted rides along in
// ?next= so the login does not dump them on /play instead.

// The parameter arrives from the URL, so it is attacker-controlled: anyone can
// send a link to /login?next=... and have it followed by whoever clicks it.
// Only same-origin paths are allowed back out, which is what stops this being
// an open redirect.
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // "//evil.example" is protocol-relative and "/\evil.example" is normalised to
  // the same thing by several browsers. Both start with a slash and both leave
  // the site, so a leading slash is not enough on its own.
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.startsWith("/\\")) return null;
  return value;
}

export function loginPath(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
