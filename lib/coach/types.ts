// Shared shapes for Coach-mode commentary. The Groq client, the prompt
// builders, the notable-move selector, the route and the coach view all read
// from here, so the reason set and the row shapes are defined once.
//
// A "reason" is why a move earned its own line of commentary. It doubles as the
// move_commentary.reason column value, so this list is the source of truth the
// migration's check constraint mirrors. Keep the two in step.

export const COMMENTARY_REASONS = [
  "blunder",
  "mistake",
  "inaccuracy",
  "best_move",
  "critical_moment",
] as const;

export type CommentaryReason = (typeof COMMENTARY_REASONS)[number];

// A per-move commentary row, minus the columns the database fills for itself
// (id, game_id, generated_at). snake_case-free because these are not column
// names the route inserts verbatim: the route maps to columns explicitly, so
// these stay ordinary identifiers.
export type MoveCommentary = {
  ply: number;
  commentary: string;
  reason: CommentaryReason;
};

// A stored per-move row carries everything a generated one does plus the
// timestamp the database stamped it with.
export type StoredMoveCommentary = MoveCommentary & { generated_at: string };

// Everything the coach view needs for one game: the summary paragraph (null
// when it could not be generated) and the per-move notes, in ply order.
export type GameCommentary = {
  summary: string | null;
  moves: StoredMoveCommentary[];
};
