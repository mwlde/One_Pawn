// Remembers that someone has signed in on this device before, so the login
// screen can say "Welcome back" to a returning user and something neutral to a
// first-time visitor. Wireframe 04 heads the screen "Welcome back"
// unconditionally, which is wrong for anyone who has never had an account.
//
// A cookie rather than localStorage: the login page reads it on the server and
// renders the right heading first time. From localStorage the heading would
// have to swap after hydration, and it is the largest text on the page.
//
// It records that *a* session existed on this browser, never whose. There is no
// address in it and no way to read one out of it, so it tells an attacker with
// the device nothing they could not learn by opening the password manager.

export const RETURNING_VISITOR_COOKIE = "onepawn_returning";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function returningVisitorCookie(): string {
  return `${RETURNING_VISITOR_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
}

export function markReturningVisitor(): void {
  document.cookie = returningVisitorCookie();
}
