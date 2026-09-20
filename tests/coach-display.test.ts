import { describe, expect, it } from "vitest";

import type { MoveAnalysis } from "@/lib/analysis/types";
import {
  buildClassificationDisplay,
  buildNotableDisplay,
  firstSentence,
} from "@/lib/coach/display";
import type { StoredMoveCommentary } from "@/lib/coach/types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
// The position after 1. e4, so ply 3 (White's second move) has a real FEN to
// render the engine's move from.
const AFTER_1_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const AFTER_1_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

function analysis(
  ply: number,
  moveUci: string,
  bestUci: string,
  isUserMove = true,
): MoveAnalysis {
  return {
    ply,
    move_uci: moveUci,
    engine_best_uci: bestUci,
    eval_before: 0,
    eval_after: 0,
    eval_loss: bestUci === moveUci ? 0 : 120,
    classification: bestUci === moveUci ? "best" : "mistake",
    is_user_move: isUserMove,
  };
}

function note(ply: number, reason: StoredMoveCommentary["reason"]): StoredMoveCommentary {
  return { ply, reason, commentary: `note for ${ply}`, generated_at: "2026-09-19T00:00:00Z" };
}

const fens = [START_FEN, AFTER_1_E4, AFTER_1_E4_E5];
const sanByPly = ["e4", "e5", "Ke2"];

describe("buildNotableDisplay", () => {
  it("joins each note to its analysis and renders the engine's move as SAN", () => {
    // Ply 3 was Ke2 (e1e2) but the engine wanted Nf3 (g1f3): a mistake.
    const analyses = [analysis(3, "e1e2", "g1f3")];
    const notes = [note(3, "mistake")];

    const [row] = buildNotableDisplay(notes, analyses, fens, sanByPly);

    expect(row).toMatchObject({
      ply: 3,
      label: "2. Ke2",
      classification: "mistake",
      reason: "mistake",
      commentary: "note for 3",
      bestSan: "Nf3",
    });
  });

  it("shows no engine move when the player matched the engine", () => {
    const analyses = [analysis(1, "e2e4", "e2e4")];
    const notes = [note(1, "best_move")];

    const [row] = buildNotableDisplay(notes, analyses, fens, sanByPly);
    expect(row.bestSan).toBeNull();
  });

  it("keeps a note even when its analysis row is missing", () => {
    const [row] = buildNotableDisplay([note(1, "critical_moment")], [], fens, sanByPly);
    // Degrades rather than dropping the line: classification falls back, the
    // commentary still shows.
    expect(row).toMatchObject({ ply: 1, commentary: "note for 1", bestSan: null });
  });
});

describe("buildClassificationDisplay", () => {
  it("lists the user's moves in ply order and drops the opponent's", () => {
    const analyses = [
      analysis(3, "e1e2", "g1f3"),
      analysis(1, "e2e4", "e2e4"),
      analysis(2, "e7e5", "e7e5", false),
    ];

    const rows = buildClassificationDisplay(analyses, fens, sanByPly);

    expect(rows.map((row) => row.ply)).toEqual([1, 3]);
    expect(rows[0]).toMatchObject({ label: "1. e4", classification: "best", bestSan: null });
    expect(rows[1]).toMatchObject({ label: "2. Ke2", classification: "mistake", bestSan: "Nf3" });
  });
});

describe("firstSentence", () => {
  it("returns the opening sentence of a note", () => {
    expect(firstSentence("This drops a knight. The engine wanted Nxe5 instead.")).toBe(
      "This drops a knight.",
    );
  });

  it("does not cut a move number in half", () => {
    expect(firstSentence("On 12. Nxd4 you lose a piece. Play Nxe5.")).toBe(
      "On 12. Nxd4 you lose a piece.",
    );
  });

  it("reads through the ellipsis in a Black move number", () => {
    expect(firstSentence("After 1... e5 the centre is contested. Then develop.")).toBe(
      "After 1... e5 the centre is contested.",
    );
  });

  it("keeps an annotation mark attached to its move", () => {
    expect(firstSentence("Nf3! keeps the tension. Well played.")).toBe(
      "Nf3! keeps the tension.",
    );
  });

  it("handles a question and a single sentence with no trailing space", () => {
    expect(firstSentence("Why take there? The bishop was hanging.")).toBe("Why take there?");
    expect(firstSentence("A clean finish.")).toBe("A clean finish.");
  });

  it("returns the whole note when it finds no sentence end", () => {
    expect(firstSentence("  Solid development  ")).toBe("Solid development");
  });
});
