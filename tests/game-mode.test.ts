import { describe, expect, it, vi } from "vitest";

import {
  isGameMode,
  readPreferredMode,
  writePreferredMode,
  type GameMode,
} from "@/lib/game/mode";

// A stub of the slice of Storage the helpers use, so the read/write logic can be
// exercised without a DOM. getItem returns whatever is seeded; setItem records.
function stubStorage(seed: string | null) {
  const setItem = vi.fn<(key: string, value: string) => void>();
  return {
    setItem,
    getItem: () => seed,
  };
}

describe("readPreferredMode", () => {
  it("returns the stored mode when it is valid", () => {
    expect(readPreferredMode(stubStorage("play"))).toBe("play");
    expect(readPreferredMode(stubStorage("coach"))).toBe("coach");
  });

  it("falls back to play when the key is missing", () => {
    expect(readPreferredMode(stubStorage(null))).toBe("play");
  });

  it("falls back to play when the stored value is not a mode", () => {
    expect(readPreferredMode(stubStorage("banana"))).toBe("play");
    expect(readPreferredMode(stubStorage(""))).toBe("play");
  });

  it("falls back to play when there is no storage at all", () => {
    expect(readPreferredMode(null)).toBe("play");
  });

  it("falls back to play when reading storage throws", () => {
    // A sandboxed or cookie-blocked browser can throw on access rather than
    // returning null. That must not propagate out of the reader.
    const throwing = {
      getItem: () => {
        throw new Error("access denied");
      },
      setItem: vi.fn(),
    };
    expect(readPreferredMode(throwing)).toBe("play");
  });
});

describe("writePreferredMode", () => {
  it("writes the mode under the stable key", () => {
    const storage = stubStorage(null);
    writePreferredMode("coach", storage);
    expect(storage.setItem).toHaveBeenCalledWith("onepawn-preferred-mode", "coach");
  });

  it("does nothing and does not throw when there is no storage", () => {
    expect(() => writePreferredMode("play", null)).not.toThrow();
  });

  it("swallows a storage write that throws", () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(() => writePreferredMode("coach", throwing)).not.toThrow();
  });
});

describe("isGameMode", () => {
  it("accepts the two modes and rejects everything else", () => {
    const modes: GameMode[] = ["play", "coach"];
    for (const mode of modes) expect(isGameMode(mode)).toBe(true);
    for (const other of ["", "Play", "COACH", null, undefined, 1]) {
      expect(isGameMode(other)).toBe(false);
    }
  });
});
