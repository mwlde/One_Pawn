// Loads a lesson's JSON and checks it against the schema in ./types.ts. Only
// server code imports this, which keeps zod out of the client bundle: the
// player receives a lesson that has already been checked.

import { z } from "zod";

import checkAndCheckmate from "@/content/lessons/basics/check-and-checkmate.json";
import pawnMovement from "@/content/lessons/basics/pawn-movement.json";
import opposition from "@/content/lessons/endgames/opposition.json";
import italianGame from "@/content/lessons/openings/italian-game.json";
import queensGambit from "@/content/lessons/openings/queens-gambit.json";
import knightFork from "@/content/lessons/tactics/knight-fork.json";
import pin from "@/content/lessons/tactics/pin.json";

import { TRACKS, type Lesson, type Track } from "./types";

// A JSON import is typed by TypeScript with every string widened, so "nudge"
// arrives as string and the file cannot be checked against Lesson at compile
// time. This check is what makes the Lesson type true at runtime.
//
// Annotated as z.ZodType<Lesson> so types.ts stays the source of truth: if the
// type gains a field this schema does not produce, typecheck fails here.
const uciMove = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/, "not a long algebraic move");

const hint = z.object({
  text: z.string().min(1),
  level: z.enum(["nudge", "tell"]),
});

const stepBase = {
  id: z.string().min(1),
  fen: z.string().min(1),
  orientation: z.enum(["white", "black"]).optional(),
  instruction: z.string().min(1),
  explanation: z.string().min(1),
};

const moveStep = z.object({
  ...stepBase,
  kind: z.literal("move"),
  hints: z.tuple([hint], hint),
  acceptedMoves: z.tuple([uciMove], uciMove),
  opponentReply: uciMove.optional(),
});

const attemptStep = z.object({
  ...stepBase,
  kind: z.literal("attempt"),
  attemptedMove: uciMove,
  hints: z.array(hint).optional(),
});

const step = z.discriminatedUnion("kind", [moveStep, attemptStep]);

const lessonSchema: z.ZodType<Lesson> = z.object({
  id: z.string().min(1),
  track: z.enum(TRACKS as [Lesson["track"], ...Lesson["track"][]]),
  title: z.string().min(1),
  order: z.number().int().positive(),
  description: z.string().min(1),
  steps: z.tuple([step], step),
});

// Matched by id rather than discovered from the folder: a new lesson is added
// here by hand. Learn navigation lists lessons from this map too, through
// loadTrackLessons below.
const LESSON_FILES: Record<string, unknown> = {
  "check-and-checkmate": checkAndCheckmate,
  "pawn-movement": pawnMovement,
  "italian-game": italianGame,
  "queens-gambit": queensGambit,
  "knight-fork": knightFork,
  pin,
  opposition,
};

// Whether the app ships a lesson with this id, without loading or validating it.
export function isLessonId(id: string): boolean {
  return Object.hasOwn(LESSON_FILES, id);
}

// Null means no lesson has that id. A lesson that exists but is malformed
// throws instead: that is an authoring error, and it should fail loudly rather
// than look like a missing page.
export function loadLesson(id: string): Lesson | null {
  if (!isLessonId(id)) return null;

  const parsed = lessonSchema.safeParse(LESSON_FILES[id]);
  if (!parsed.success) {
    // prettifyError names the path of each bad field, e.g. "at steps[2].hints".
    throw new Error(`Lesson "${id}" does not match the schema:\n${z.prettifyError(parsed.error)}`);
  }

  if (parsed.data.id !== id) {
    throw new Error(`Lesson file registered as "${id}" declares id "${parsed.data.id}".`);
  }

  return parsed.data;
}

// Every lesson in a track, in the order the track teaches them. Each one is
// loaded and validated, so a malformed lesson breaks the track page loudly
// rather than quietly dropping out of the list.
export function loadTrackLessons(track: Track): Lesson[] {
  return Object.keys(LESSON_FILES)
    .map((id) => loadLesson(id))
    .filter((lesson): lesson is Lesson => lesson !== null && lesson.track === track)
    .sort((a, b) => a.order - b.order);
}
