import { describe, expect, it } from "vitest";

import {
  isRegistrationDuplicate,
  loginErrorMessage,
  PASSWORD_MIN_LENGTH,
  registerErrorMessage,
  validateEmail,
  validatePassword,
} from "@/lib/auth/validation";

// The auth form calls validatePassword before it calls Supabase, so covering
// the function covers the form's client-side check. The form itself is not
// rendered here: vitest runs in a node environment with no DOM, per
// vitest.config.mts, and CLAUDE.md keeps UI testing to Playwright smoke tests.
describe("password length validation", () => {
  it("rejects a password shorter than the minimum", () => {
    expect(validatePassword("short")).toBe(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  });

  it("rejects a password one character below the minimum", () => {
    const password = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    expect(validatePassword(password)).not.toBeNull();
  });

  it("accepts a password of exactly the minimum length", () => {
    const password = "a".repeat(PASSWORD_MIN_LENGTH);
    expect(validatePassword(password)).toBeNull();
  });

  it("accepts a password longer than the minimum", () => {
    expect(validatePassword("correct horse battery staple")).toBeNull();
  });

  it("asks for a password rather than complaining about length when empty", () => {
    expect(validatePassword("")).toBe("Enter a password.");
  });

  // Length is counted in characters, not bytes. A 12-character passphrase in a
  // non-Latin script must pass.
  it("counts characters, not bytes", () => {
    expect(validatePassword("парольпароль")).toBeNull();
  });
});

describe("email validation", () => {
  it("requires an email address", () => {
    expect(validateEmail("   ")).toBe("Enter your email address.");
  });

  it("leaves format checking to the browser and Supabase", () => {
    expect(validateEmail("you@domain.com")).toBeNull();
  });
});

describe("auth error copy", () => {
  // The whole point of this mapping: a wrong password and an address with no
  // account must produce the same sentence.
  it("gives one message for bad credentials, whatever was wrong", () => {
    expect(loginErrorMessage("Invalid login credentials")).toBe(
      "Email or password doesn't match.",
    );
  });

  it("never passes a raw Supabase error through to the user", () => {
    expect(loginErrorMessage("AuthApiError: unexpected_failure")).toBe(
      "Could not log you in. Try again.",
    );
  });

  it("points a registered address at the login screen", () => {
    expect(registerErrorMessage("User already registered")).toBe(
      "Email already registered. Log in instead.",
    );
  });
});

describe("duplicate registration detection", () => {
  // Supabase signals a duplicate signup with an empty identities array on an
  // otherwise successful response.
  it("treats an empty identities array as a duplicate", () => {
    expect(isRegistrationDuplicate([])).toBe(true);
  });

  it("treats a populated identities array as a new account", () => {
    expect(isRegistrationDuplicate([{ id: "abc" }])).toBe(false);
  });

  it("does not mistake a missing array for a duplicate", () => {
    expect(isRegistrationDuplicate(undefined)).toBe(false);
    expect(isRegistrationDuplicate(null)).toBe(false);
  });
});
