import { describe, expect, it } from "vitest";

import { formatSupportId } from "@/lib/auth/support-id";

describe("support id", () => {
  it("takes the first eight characters of a UUID as two groups of four", () => {
    expect(formatSupportId("a3b4c5d6-1234-4321-8765-0123456789ab")).toBe("A3B4-C5D6");
  });

  it("uppercases the hexadecimal", () => {
    expect(formatSupportId("deadbeef-0000-4000-8000-000000000000")).toBe("DEAD-BEEF");
  });

  it("is stable for the same id", () => {
    const id = "0f9c2e51-7b6a-4d3c-9a1b-2c3d4e5f6071";
    expect(formatSupportId(id)).toBe(formatSupportId(id));
  });

  it("is not thrown by an id that already has no dashes", () => {
    expect(formatSupportId("a3b4c5d612344321876501234567 89ab".replace(" ", ""))).toBe("A3B4-C5D6");
  });

  // The profile omits the line rather than printing a truncated one. Nothing in
  // the app can produce an id this short, so this only guards the formatter.
  it("returns null when there is not enough to format", () => {
    expect(formatSupportId("a3b4")).toBeNull();
    expect(formatSupportId("")).toBeNull();
  });
});
