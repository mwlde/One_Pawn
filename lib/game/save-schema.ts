// The validator for POST /api/games/save. Kept out of lib/game/save.ts, which
// the play screen imports, so zod stays out of the client bundle: the client
// builds this payload but never checks it, because its opinion does not count.

import { z } from "zod";

import { DIFFICULTY_DEPTHS, type TimeControlId } from "./settings";

// Both lists are derived from the game settings rather than retyped, so a change
// to a depth or a time control cannot leave the validator behind. The point is
// not to help the client, which controls this data: it is to keep the accepted
// set exactly as wide as the app's own options and no wider.
const ALLOWED_DEPTHS: readonly number[] = Object.values(DIFFICULTY_DEPTHS);
const ALLOWED_TIME_CONTROLS = ["1+0", "3+2", "10+0"] as const satisfies readonly TimeControlId[];

export const saveGameSchema = z.object({
  pgn: z.string().min(1).max(10_000),
  result: z.enum(["white_wins", "black_wins", "draw", "abandoned"]),
  user_color: z.enum(["white", "black"]),
  difficulty: z.number().int().refine((depth) => ALLOWED_DEPTHS.includes(depth)),
  time_control: z.enum(ALLOWED_TIME_CONTROLS),
  move_count: z.number().int().positive().max(1000),
});
