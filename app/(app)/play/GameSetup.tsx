"use client";

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

export function GameSetup({ initialSettings, onStart }: GameSetupProps) {
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

  const timeControl = TIME_CONTROLS[settings.timeControl];
  const incrementNote =
    timeControl.incrementSeconds === 0
      ? "no increment"
      : `${timeControl.incrementSeconds}s increment`;

  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-6 md:items-center md:py-8">
      <div className="w-full max-w-md shrink-0 border border-ink bg-panel p-5 md:p-10">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          New game
        </div>
        <h1 className="mb-6 text-3xl font-bold tracking-tight md:mb-8 md:text-4xl">
          Play the engine
        </h1>

        <div className="flex flex-col gap-5 md:gap-6">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Mode
            </div>
            <div role="radiogroup" aria-label="Mode" className="flex flex-col gap-2">
              {MODES.map((mode) => {
                const selected = preferredMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => writePreferredMode(mode)}
                    className={`border p-3 text-left transition-colors ${
                      selected ? "border-ink bg-tint" : "border-hairline hover:border-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm ${selected ? "font-semibold" : ""}`}>
                        {MODE_LABELS[mode]}
                      </span>
                      <span
                        aria-hidden
                        className={`h-3 w-3 shrink-0 border ${
                          selected ? "border-ink bg-ink" : "border-hairline"
                        }`}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                      {MODE_DESCRIPTIONS[mode]}
                    </p>
                  </button>
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

        <p className="mt-5 font-mono text-[11px] leading-relaxed text-muted md:mt-6">
          Engine searches to depth {depthFor(settings.difficulty)}.
          <br />
          {timeControl.baseSeconds / 60} min per side, {incrementNote}.
        </p>

        {/* Not gated on engine readiness. The Worker queues any request that
            arrives before WASM has finished loading, so a game started early
            simply waits on the engine's first move rather than failing. */}
        <Button
          variant="primary"
          className="mt-6 w-full md:mt-8"
          onClick={() => onStart({ ...settings, mode: preferredMode })}
        >
          New game
        </Button>
      </div>
    </div>
  );
}
