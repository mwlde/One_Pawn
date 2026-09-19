import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callGroq,
  GroqConfigError,
  GroqRateLimitError,
  GroqServerError,
} from "@/lib/coach/groq";

// A minimal stand-in for a fetch Response with just the members callGroq reads.
function fakeResponse(init: {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}): Response {
  return {
    ok: init.ok,
    status: init.status,
    json: init.json ?? (async () => ({})),
    text: init.text ?? (async () => ""),
  } as unknown as Response;
}

const OK_BODY = { choices: [{ message: { content: "  A short explanation.  " } }] };

describe("callGroq", () => {
  const originalKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("returns the trimmed completion text on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeResponse({ ok: true, status: 200, json: async () => OK_BODY })),
    );

    const result = await callGroq("system", "user");
    expect(result).toBe("A short explanation.");
  });

  it("throws GroqConfigError when the key is missing", async () => {
    delete process.env.GROQ_API_KEY;
    // fetch should never be reached; make it throw if it is.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("fetch should not be called without a key");
      }),
    );

    await expect(callGroq("system", "user")).rejects.toBeInstanceOf(GroqConfigError);
  });

  it("maps a 429 to GroqRateLimitError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeResponse({ ok: false, status: 429, text: async () => "slow down" })),
    );

    await expect(callGroq("system", "user")).rejects.toBeInstanceOf(GroqRateLimitError);
  });

  it("maps a 5xx to GroqServerError carrying the status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeResponse({ ok: false, status: 503, text: async () => "unavailable" })),
    );

    await expect(callGroq("system", "user")).rejects.toMatchObject({
      name: "GroqServerError",
      status: 503,
    });
  });

  it("treats an empty completion as a server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fakeResponse({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "" } }] }) }),
      ),
    );

    await expect(callGroq("system", "user")).rejects.toBeInstanceOf(GroqServerError);
  });
});
