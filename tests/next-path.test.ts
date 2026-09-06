import { describe, expect, it } from "vitest";

import { loginPath, safeNextPath } from "@/lib/auth/next-path";

describe("safeNextPath", () => {
  it("accepts a path on this site", () => {
    expect(safeNextPath("/profile")).toBe("/profile");
    expect(safeNextPath("/profile/games/abc?x=1")).toBe("/profile/games/abc?x=1");
  });

  it("rejects anything that leaves the site", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects a missing or repeated parameter", () => {
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/profile", "/play"])).toBeNull();
  });
});

describe("loginPath", () => {
  it("encodes the destination so a query string of its own survives", () => {
    expect(loginPath("/profile")).toBe("/login?next=%2Fprofile");
  });
});
