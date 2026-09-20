import { describe, expect, it } from "vitest";

import {
  classifyFailure,
  isRetriableFailure,
  type CommentaryFailure,
} from "@/lib/coach/client";
import { COMMENTARY_FAILURE_MESSAGE } from "@/lib/coach/display";

describe("classifyFailure", () => {
  it("reads the route's own error codes ahead of the status", () => {
    expect(classifyFailure(400, "not_analyzed")).toBe("not_analyzed");
    expect(classifyFailure(400, "not_coach_mode")).toBe("refused");
  });

  it("treats the auth and ownership statuses as refusals", () => {
    expect(classifyFailure(401, "not_authenticated")).toBe("refused");
    expect(classifyFailure(404, "not_found")).toBe("refused");
  });

  it("treats our own route's faults as server failures", () => {
    expect(classifyFailure(500, "read_failed")).toBe("server");
    expect(classifyFailure(500, "save_failed")).toBe("server");
    expect(classifyFailure(500, "commentary_tables_missing")).toBe("server");
  });

  // Guessing "refused" for something unknown would strand the user with no way
  // forward. Guessing "server" costs one request and keeps the button live.
  it("falls back to a server failure for an unrecognised answer", () => {
    expect(classifyFailure(503, null)).toBe("server");
    expect(classifyFailure(418, "something_new")).toBe("server");
  });
});

describe("isRetriableFailure", () => {
  it("offers a retry for everything the user could get past", () => {
    expect(isRetriableFailure("groq")).toBe(true);
    expect(isRetriableFailure("network")).toBe(true);
    expect(isRetriableFailure("server")).toBe(true);
    // The panel runs the analysis before asking again, so this one clears.
    expect(isRetriableFailure("not_analyzed")).toBe(true);
  });

  it("offers no retry when the answer cannot change", () => {
    expect(isRetriableFailure("refused")).toBe(false);
  });
});

describe("COMMENTARY_FAILURE_MESSAGE", () => {
  const failures: CommentaryFailure[] = [
    "groq",
    "network",
    "not_analyzed",
    "server",
    "refused",
  ];

  it("has a sentence for every failure, with no jargon from the transport", () => {
    for (const failure of failures) {
      const message = COMMENTARY_FAILURE_MESSAGE[failure];
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/groq|api|http|500/i);
    }
  });
});
