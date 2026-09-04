import { describe, expect, it } from "vitest";

import { RETURNING_VISITOR_COOKIE, returningVisitorCookie } from "@/lib/auth/returning-visitor";

// The login page reads this cookie on the server to decide between "Welcome
// back" and "Log in", so the attributes are what make it work rather than
// incidental detail.
describe("returning visitor cookie", () => {
  const cookie = returningVisitorCookie();

  it("sets the flag the login page looks for", () => {
    expect(cookie.startsWith(`${RETURNING_VISITOR_COOKIE}=1`)).toBe(true);
  });

  it("applies site-wide, so /login sees a flag set from /play", () => {
    expect(cookie).toContain("Path=/");
  });

  it("outlives the session, which is the entire point", () => {
    expect(cookie).toContain(`Max-Age=${60 * 60 * 24 * 365}`);
  });

  it("is not sent on cross-site requests", () => {
    expect(cookie).toContain("SameSite=Lax");
  });

  // It is read by server-rendered pages but written from the client, so it must
  // not be HttpOnly. Asserting the absence keeps that from being "fixed" later.
  it("stays readable from document.cookie", () => {
    expect(cookie).not.toContain("HttpOnly");
  });
});
