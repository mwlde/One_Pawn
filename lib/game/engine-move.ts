// The engine answers in long algebraic notation: "e2e4", or "e7e8q" for a
// promotion (see moveToString in engine/src/move.cpp). chess.js wants the same
// move as an object. This is the whole of the translation between them.

export type EngineMove = {
  from: string;
  to: string;
  promotion?: string;
};

const UCI_PATTERN = /^([a-h][1-8])([a-h][1-8])([qrbn]?)$/;

// Returns null for anything that is not a well-formed move string, so a garbled
// reply surfaces as an error the player can see rather than an exception. This
// only checks the shape: whether the move is legal in the current position is
// chess.js's job, not this function's.
export function parseEngineMove(uci: string): EngineMove | null {
  const match = UCI_PATTERN.exec(uci);
  if (match === null) return null;

  const [, from, to, promotion] = match;
  return promotion === "" ? { from, to } : { from, to, promotion };
}
