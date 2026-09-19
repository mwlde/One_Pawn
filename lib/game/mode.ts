// The two ways a game is played. Play is plain chess; coach will run analysis
// and commentary at the end of the game once 4B lands. This session adds the
// choice and carries it through save; no coach behaviour changes yet.
//
// The mode is locked at setup and stored on the saved game, so a game always
// records the mode it was played in even after coach features arrive.

export type GameMode = "play" | "coach";

// A tuple literal (not widened to GameMode[]), so zod can build an enum from it
// in save-schema.ts. Still iterates as the setup screen's option list.
export const MODES = ["play", "coach"] as const satisfies readonly GameMode[];

export const DEFAULT_MODE: GameMode = "play";

export const MODE_LABELS: Record<GameMode, string> = {
  play: "Play",
  coach: "Play with coach",
};

// UI copy, British spelling per CLAUDE.md (the setup brief spells it the
// American way; the house style wins for consistency with the rest of the app).
export const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  play: "Just chess. Games save to your profile. Analyse later if you want.",
  coach: "Chess with feedback. Analysis and commentary at the end of your game.",
};

export function isGameMode(value: unknown): value is GameMode {
  return value === "play" || value === "coach";
}

// The user's last choice, remembered across visits. A plain string, not JSON:
// the value is one of two words and reads back the same way it was written.
const STORAGE_KEY = "onepawn-preferred-mode";

// The slice of Storage the reader and writer touch. Narrowed so the helpers can
// be tested with a stub and so a browser that denies storage access degrades to
// a no-op rather than throwing.
type ModeStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): ModeStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Access to localStorage itself can throw (sandboxed iframe, blocked
    // cookies). Treated as "no storage", so the caller falls back to default.
    return null;
  }
}

// The stored preference, or the default when there is nothing usable there:
// no storage, no key, or a value that is not one of the two modes.
export function readPreferredMode(storage: ModeStorage | null = defaultStorage()): GameMode {
  if (storage === null) return DEFAULT_MODE;

  let stored: string | null;
  try {
    stored = storage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_MODE;
  }

  return isGameMode(stored) ? stored : DEFAULT_MODE;
}

// The browser's own `storage` event only fires in other tabs, so a same-tab
// write needs its own nudge for a useSyncExternalStore subscriber to notice.
const MODE_EVENT = "onepawn-mode-change";

export function writePreferredMode(
  mode: GameMode,
  storage: ModeStorage | null = defaultStorage(),
): void {
  if (storage === null) return;
  try {
    storage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode, quota, or denied access. The preference is a convenience,
    // not state anything depends on, so a failed write is silently fine.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MODE_EVENT));
  }
}

// The three pieces useSyncExternalStore needs to track the stored mode without a
// setState-in-effect: subscribe to changes (this tab and others), read the
// current value, and a server value that matches the first client render so
// hydration does not mismatch. The setup screen wires these together.
export function subscribePreferredMode(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(MODE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MODE_EVENT, callback);
  };
}

export function getPreferredModeSnapshot(): GameMode {
  return readPreferredMode();
}

export function getPreferredModeServerSnapshot(): GameMode {
  return DEFAULT_MODE;
}
