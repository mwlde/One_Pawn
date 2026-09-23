import { describe, expect, it } from "vitest";

import {
  checkCoachRateLimit,
  COACH_DAILY_LIMIT,
  formatResetIn,
  type CoachUsageClient,
} from "@/lib/coach/rate-limit";

// A stand-in for the one Supabase query checkCoachRateLimit runs. The chain is
// fixed (from → select → eq → gte → order), so each link just returns the next
// and the terminal resolves to the rows the test set up. No database, per
// vitest.config.mts and CLAUDE.md.
function stubClient(rows: { created_at: string }[], error: unknown = null): CoachUsageClient {
  const result = Promise.resolve({ data: error === null ? rows : null, error });
  const stub = {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: () => ({ returns: () => result }),
          }),
        }),
      }),
    }),
  };
  // The real client is one deep generic type; the check uses only the chain
  // above, so a stub of it is cast in rather than reconstructed.
  return stub as unknown as CoachUsageClient;
}

const NOW = new Date("2026-09-23T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

// N timestamps inside the window, oldest first, spaced an hour apart ending an
// hour before now. The query orders ascending, so this is the order the check
// sees them in.
function usageRows(count: number): { created_at: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    created_at: new Date(NOW.getTime() - (count - index) * 60 * 60 * 1000).toISOString(),
  }));
}

describe("checkCoachRateLimit", () => {
  it("allows a user who has used none", async () => {
    const result = await checkCoachRateLimit("user-1", stubClient([]), NOW);
    expect(result).toEqual({
      allowed: true,
      used: 0,
      limit: COACH_DAILY_LIMIT,
      resetsAt: null,
    });
  });

  it("allows a user who is one under the limit", async () => {
    const result = await checkCoachRateLimit("user-1", stubClient(usageRows(2)), NOW);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(2);
    expect(result.resetsAt).not.toBeNull();
  });

  it("blocks a user who is exactly at the limit and reports when it resets", async () => {
    const rows = usageRows(COACH_DAILY_LIMIT);
    const result = await checkCoachRateLimit("user-1", stubClient(rows), NOW);

    expect(result.allowed).toBe(false);
    expect(result.used).toBe(COACH_DAILY_LIMIT);
    expect(result.limit).toBe(COACH_DAILY_LIMIT);
    // The reset is the oldest usage in the window plus 24 hours.
    const oldest = new Date(rows[0].created_at).getTime();
    expect(result.resetsAt?.getTime()).toBe(oldest + DAY_MS);
  });

  it("blocks a user who is over the limit", async () => {
    const result = await checkCoachRateLimit("user-1", stubClient(usageRows(COACH_DAILY_LIMIT + 1)), NOW);
    expect(result.allowed).toBe(false);
  });

  it("throws on a read failure rather than guessing a count", async () => {
    await expect(
      checkCoachRateLimit("user-1", stubClient([], { message: "boom" }), NOW),
    ).rejects.toThrow();
  });
});

describe("formatResetIn", () => {
  it("rounds a multi-hour wait to hours", () => {
    expect(formatResetIn(new Date(NOW.getTime() + 5 * 60 * 60 * 1000), NOW)).toBe("in about 5 hours");
  });

  it("uses the singular an hour just over the hour mark", () => {
    expect(formatResetIn(new Date(NOW.getTime() + 60 * 60 * 1000), NOW)).toBe("in about an hour");
  });

  it("drops to minutes under an hour", () => {
    expect(formatResetIn(new Date(NOW.getTime() + 40 * 60 * 1000), NOW)).toBe("in about 40 minutes");
  });

  it("reads a past or now reset as shortly", () => {
    expect(formatResetIn(new Date(NOW.getTime() - 1000), NOW)).toBe("shortly");
  });
});
