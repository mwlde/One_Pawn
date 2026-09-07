import { describe, expect, it } from "vitest";

import { deletionConfirmationMatches } from "@/lib/auth/account-deletion";

// The confirm button is disabled until this returns true, and the delete route
// calls it again before the RPC. Only the pure function is covered: the
// component is not rendered here, per vitest.config.mts and CLAUDE.md.
const ACCOUNT = "player@example.com";

describe("deletion confirmation", () => {
  it("matches the address on the account", () => {
    expect(deletionConfirmationMatches(ACCOUNT, ACCOUNT)).toBe(true);
  });

  it("rejects a different address", () => {
    expect(deletionConfirmationMatches("someone@example.com", ACCOUNT)).toBe(false);
  });

  it("rejects an empty box", () => {
    expect(deletionConfirmationMatches("", ACCOUNT)).toBe(false);
    expect(deletionConfirmationMatches("   ", ACCOUNT)).toBe(false);
  });

  // A near miss is the case worth being sure about: this is the gate against a
  // deletion the user did not mean, so almost right is wrong.
  it("rejects a near miss", () => {
    expect(deletionConfirmationMatches("player@example.co", ACCOUNT)).toBe(false);
    expect(deletionConfirmationMatches("player@exampl.com", ACCOUNT)).toBe(false);
    expect(deletionConfirmationMatches("playe@example.com", ACCOUNT)).toBe(false);
  });

  it("rejects a partial address", () => {
    expect(deletionConfirmationMatches("player", ACCOUNT)).toBe(false);
    expect(deletionConfirmationMatches("player@", ACCOUNT)).toBe(false);
  });

  it("ignores surrounding whitespace from a paste or an autofill", () => {
    expect(deletionConfirmationMatches("  player@example.com  ", ACCOUNT)).toBe(true);
    expect(deletionConfirmationMatches("player@example.com\n", ACCOUNT)).toBe(true);
  });

  it("ignores case, which Supabase does not preserve either", () => {
    expect(deletionConfirmationMatches("Player@Example.COM", ACCOUNT)).toBe(true);
    expect(deletionConfirmationMatches(ACCOUNT, "PLAYER@EXAMPLE.COM")).toBe(true);
  });

  it("does not ignore whitespace inside the address", () => {
    expect(deletionConfirmationMatches("player @example.com", ACCOUNT)).toBe(false);
    expect(deletionConfirmationMatches("play er@example.com", ACCOUNT)).toBe(false);
  });

  // user.email is optional on Supabase's user type. An account with no address
  // has nothing to confirm against, and an empty box must not satisfy it.
  it("refuses when the account has no email on file", () => {
    expect(deletionConfirmationMatches("", null)).toBe(false);
    expect(deletionConfirmationMatches("", undefined)).toBe(false);
    expect(deletionConfirmationMatches("", "")).toBe(false);
    expect(deletionConfirmationMatches("anything@example.com", null)).toBe(false);
  });
});
