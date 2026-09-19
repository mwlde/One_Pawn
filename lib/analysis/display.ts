import type { Classification } from "./types";

// How each tier reads on screen. The label is British-plain prose; the badge is
// a set of Tailwind classes.
//
// The colours are deliberate. The rest of the app is a single monochrome paper
// scheme (app/globals.css), so these are the one place semantic colour earns
// its keep: a player scanning a game wants blunders to jump out. They are given
// as muted hex arbitrary values rather than Tailwind's default palette, both to
// stay independent of whether that palette is generated and to keep the tones
// desaturated enough to sit on the warm surface without shouting. "Good" stays
// neutral on purpose: a good move is the unremarkable baseline.
type TierStyle = {
  label: string;
  badge: string;
};

export const CLASSIFICATION_DISPLAY: Record<Classification, TierStyle> = {
  best: { label: "Best", badge: "bg-[#cfe0c3] text-[#33502a] border-[#a9c095]" },
  excellent: { label: "Excellent", badge: "bg-[#dde8d2] text-[#4a5f3d] border-[#bacaa6]" },
  good: { label: "Good", badge: "bg-panel text-muted border-hairline" },
  inaccuracy: { label: "Inaccuracy", badge: "bg-[#ece3c2] text-[#6b5a1f] border-[#d0c18a]" },
  mistake: { label: "Mistake", badge: "bg-[#ecd8c2] text-[#7a4a20] border-[#d5b088]" },
  blunder: { label: "Blunder", badge: "bg-[#ecccc6] text-[#7a2f26] border-[#d59b90]" },
};

// "1. e4" for White's first move, "1... e5" for Black's. ply is 1-indexed, so
// odd plies are White and the full-move number is ply rounded up, halved.
export function formatMoveLabel(ply: number, san: string): string {
  const moveNumber = Math.ceil(ply / 2);
  const separator = ply % 2 === 1 ? "." : "...";
  return `${moveNumber}${separator} ${san}`;
}
