"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

// Two steps, because one click must never end a game. Not a dialog either:
// wireframe note F reserves the confirm dialog for leaving the game entirely,
// and a resignation is a move rather than an exit. The button becomes its own
// confirmation, so nothing covers the board while the player reconsiders.
export function ResignButton({ onResign }: { onResign: () => void }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button className="flex-1" onClick={() => setArmed(true)}>
        Resign
      </Button>
    );
  }

  return (
    <>
      <Button
        className="flex-1"
        onClick={() => {
          setArmed(false);
          onResign();
        }}
      >
        Confirm
      </Button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="shrink-0 font-mono text-[10px] text-muted underline underline-offset-2 hover:text-ink"
      >
        Cancel
      </button>
    </>
  );
}
