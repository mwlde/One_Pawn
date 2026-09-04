"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
        <Button variant="primary" className="mt-6 w-full md:mt-8" onClick={() => onStart(settings)}>
          New game
        </Button>
      </div>
    </div>
  );
}
