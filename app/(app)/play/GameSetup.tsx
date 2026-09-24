"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  getPreferredModeServerSnapshot,
  getPreferredModeSnapshot,
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  MODES,
  subscribePreferredMode,
  writePreferredMode,
} from "@/lib/game/mode";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  depthFor,
  SIDES,
  TIME_CONTROLS,
  TIME_CONTROL_IDS,
  type GameSettings,
} from "@/lib/game/settings";

type GameSetupProps = {
  initialSettings: GameSettings;
  // Coach mode is gated behind a session: it saves and analyses the game, and
  // both need an account. A guest sees the option but cannot pick it.
  isLoggedIn: boolean;
  onStart: (settings: GameSettings) => void;
};

const SIDE_OPTIONS = SIDES.map((side) => ({
  value: side,
  label: side === "white" ? "White" : "Black",
}));

const DIFFICULTY_OPTIONS = DIFFICULTIES.map((difficulty) => ({
  value: difficulty,
  label: DIFFICULTY_LABELS[difficulty],
}));

const TIME_CONTROL_OPTIONS = TIME_CONTROL_IDS.map((id) => ({
  value: id,
  label: TIME_CONTROLS[id].label,
}));

export function GameSetup({ initialSettings, isLoggedIn, onStart }: GameSetupProps) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  // The remembered mode lives in localStorage, an external store. Reading it
  // through useSyncExternalStore keeps it SSR-safe (the server and first client
  // render both see the default, so hydration matches) and needs no
  // setState-in-effect: a change in another tab, or this one, re-renders on its
  // own. It is the source of truth for the selected mode; settings.mode is only
  // read when a game actually starts.
  const preferredMode = useSyncExternalStore(
    subscribePreferredMode,
    getPreferredModeSnapshot,
    getPreferredModeServerSnapshot,
  );

  // A guest whose remembered choice is coach still starts a Play game: the mode
  // is gated, and the remembered preference is left untouched so it returns the
  // moment they log in. Nothing here writes coach back to storage for a guest.
  const effectiveMode = !isLoggedIn && preferredMode === "coach" ? "play" : preferredMode;

  const timeControl = TIME_CONTROLS[settings.timeControl];
  // Spelled out for a reader who does not know the shorthand: an increment is a
  // few seconds added to your clock after every move you make.
  const incrementNote =
    timeControl.incrementSeconds === 0
      ? "no increment"
      : `plus ${timeControl.incrementSeconds} seconds added after each move`;

  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-6 md:items-center md:py-8">
      <div className="w-full max-w-md shrink-0 rounded border border-rule bg-surface p-6 md:p-8">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite">
          New game
        </div>
        <h1 className="mb-6 font-display text-3xl font-bold tracking-[-0.02em] md:mb-8 md:text-4xl">
          Play the engine
        </h1>

        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-2 text-xs text-graphite">
              Mode
            </div>
            <div role="radiogroup" aria-label="Mode" className="flex flex-col gap-2">
              {MODES.map((mode) => {
                const locked = mode === "coach" && !isLoggedIn;
                const selected = !locked && effectiveMode === mode;
                return (
                  <div key={mode}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-disabled={locked || undefined}
                      disabled={locked}
                      onClick={() => {
                        if (!locked) writePreferredMode(mode);
                      }}
                      className={`w-full rounded border p-3 text-left transition-colors ${
                        locked
                          ? "cursor-not-allowed border-rule opacity-50"
                          : selected
                            ? "border-ink bg-surface-sunk"
                            : "border-rule hover:border-rule-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm text-ink ${selected ? "font-medium" : ""}`}>
                          {MODE_LABELS[mode]}
                        </span>
                        <span
                          aria-hidden
                          className={`h-3 w-3 shrink-0 rounded-full border ${
                            selected ? "border-ink bg-ink" : "border-rule-strong"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-graphite">
                        {MODE_DESCRIPTIONS[mode]}
                      </p>
                    </button>
                    {locked ? (
                      <p className="mt-1 text-xs leading-relaxed text-graphite">
                        <Link
                          href="/login"
                          className="text-info-text underline underline-offset-2 transition-colors hover:text-ink"
                        >
                          Log in
                        </Link>{" "}
                        to use coach mode.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <SegmentedControl
            label="Your side"
            options={SIDE_OPTIONS}
            value={settings.side}
            onChange={(side) => setSettings((current) => ({ ...current, side }))}
          />
          <SegmentedControl
            label="Difficulty"
            options={DIFFICULTY_OPTIONS}
            value={settings.difficulty}
            onChange={(difficulty) =>
              setSettings((current) => ({ ...current, difficulty }))
            }
          />
          <SegmentedControl
            label="Time control"
            options={TIME_CONTROL_OPTIONS}
            value={settings.timeControl}
            onChange={(id) => setSettings((current) => ({ ...current, timeControl: id }))}
          />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-graphite">
          {timeControl.category} &middot; {timeControl.baseSeconds / 60} minutes each side,{" "}
          {incrementNote}.
          <br />
          Engine searches to depth {depthFor(settings.difficulty)}.
        </p>

        {/* Not gated on engine readiness. The Worker queues any request that
            arrives before WASM has finished loading, so a game started early
            simply waits on the engine's first move rather than failing. */}
        <Button
          variant="primary"
          className="mt-6 w-full md:mt-8"
          onClick={() => onStart({ ...settings, mode: effectiveMode })}
        >
          New game
        </Button>
      </div>
    </div>
  );
}
