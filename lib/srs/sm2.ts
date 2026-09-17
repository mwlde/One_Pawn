// SM-2, the SuperMemo 2 spaced repetition algorithm (Wozniak, 1987). Pure: it
// takes an item's state and how well a review went, and returns the next
// state. Reading and writing srs_state is the caller's job.
//
// One deliberate difference from Wozniak's original text, which leaves the ease
// factor alone on a failed review: here the ease update always applies, as in
// most modern descriptions. A lesson the user keeps failing gets steadily
// shorter intervals once they start passing it again.

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export type Sm2State = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type Sm2Result = Sm2State & {
  nextReviewAt: Date;
};

export const MIN_EASE_FACTOR = 1.3;

const DAY_MS = 24 * 60 * 60 * 1000;

// now is a parameter so tests can pin the clock. Callers leave it out.
export function computeNextReview(currentState: Sm2State, quality: Quality, now: Date = new Date()): Sm2Result {
  let intervalDays: number;
  let repetitions: number;

  if (quality < 3) {
    intervalDays = 1;
    repetitions = 0;
  } else {
    if (currentState.repetitions === 0) {
      intervalDays = 1;
    } else if (currentState.repetitions === 1) {
      intervalDays = 6;
    } else {
      // The ease factor from before this review, as in the original: the
      // interval earned now is scaled by how easy the item has been so far.
      intervalDays = Math.round(currentState.intervalDays * currentState.easeFactor);
    }
    repetitions = currentState.repetitions + 1;
  }

  return {
    easeFactor: nextEaseFactor(currentState.easeFactor, quality),
    intervalDays,
    repetitions,
    nextReviewAt: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}

// Quality 5 adds 0.1, 4 leaves it, 3 takes 0.14, 2 takes 0.32, 1 takes 0.54
// and 0 takes 0.8.
function nextEaseFactor(easeFactor: number, quality: Quality): number {
  const miss = 5 - quality;
  const next = easeFactor + (0.1 - miss * (0.08 + miss * 0.02));
  // Every step is a whole number of hundredths, so rounding to two places only
  // removes float noise (2.7 + 0.1 is 2.8000000000000003). Without it the
  // noise compounds across reviews and shows up in stored values.
  return Math.max(MIN_EASE_FACTOR, Math.round(next * 100) / 100);
}
