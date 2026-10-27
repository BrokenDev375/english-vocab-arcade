export * from "./answer-normalization";
export * from "./shuffle";
export * from "./question-engine";
export * from "./review-scheduler";

import { shuffle, createSeededRng } from "./shuffle";
import { normalizeAnswer } from "./answer-normalization";

export const normalizeAnswerText = normalizeAnswer;

export function shuffleWithSeed<T>(array: readonly T[], seed: string | number): T[] {
  let numericSeed = 42;
  if (typeof seed === "number") {
    numericSeed = seed;
  } else if (typeof seed === "string") {
    numericSeed = 0;
    for (let i = 0; i < seed.length; i++) {
      numericSeed = (numericSeed * 31 + seed.charCodeAt(i)) >>> 0;
    }
  }
  const rng = createSeededRng(numericSeed);
  return shuffle(array, rng);
}
