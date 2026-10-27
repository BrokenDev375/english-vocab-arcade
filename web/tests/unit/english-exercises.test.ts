import { describe, it, expect } from "vitest";
import {
  DEMO_GRAMMAR_EXERCISES,
  DEMO_READING_EXERCISE,
  DEMO_TRANSLATION_EXERCISES,
} from "@/data/demo/exercises.demo";
import { normalizeAnswerText, shuffleWithSeed } from "@/features/study/engine";

describe("T16 - English Exercises (Grammar, Reading, Translation - P10)", () => {
  it("Grammar: token shuffling preserves all words and accepted orders evaluate accurately", () => {
    const exercise = DEMO_GRAMMAR_EXERCISES.exercises[0];
    const shuffled = shuffleWithSeed(exercise.tokens, "seed-test");

    expect(shuffled).toHaveLength(exercise.tokens.length);
    expect(new Set(shuffled)).toEqual(new Set(exercise.tokens));

    // Accepted order match
    const isAccepted = exercise.acceptedTokenOrders.some((order) => {
      return order.join(" ") === exercise.sentenceEn;
    });
    expect(isAccepted).toBe(true);

    // Incomplete or swapped order fails
    const badOrder = ["spirit", "She", "showed", "a", "tenacious", "during", "the", "challenge."];
    const isBadAccepted = exercise.acceptedTokenOrders.some((order) => {
      return order.every((tok, idx) => tok === badOrder[idx]);
    });
    expect(isBadAccepted).toBe(false);
  });

  it("Reading: passage contains 4 closed questions with single correctIndex between 0 and 3", () => {
    const reading = DEMO_READING_EXERCISE;
    expect(reading.questions).toHaveLength(4);

    for (const q of reading.questions) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      // All 4 options must be distinct
      const uniqueOptions = new Set(q.options);
      expect(uniqueOptions.size).toBe(4);
    }
  });

  it("Translation: normalizes answer and evaluates against acceptedAnswers cleanly", () => {
    const ex = DEMO_TRANSLATION_EXERCISES.exercises[0];

    // Reference answer with different casing / whitespace
    const userGood = "  they are tenacious and dedicated workers.  ";
    const normalizedUser = normalizeAnswerText(userGood);

    const matches = ex.acceptedAnswers.some((ans) => {
      return normalizeAnswerText(ans) === normalizedUser;
    });
    expect(matches).toBe(true);

    // Unaccepted answer does not match
    const userBad = "They are lazy workers.";
    const badMatches = ex.acceptedAnswers.some((ans) => {
      return normalizeAnswerText(ans) === normalizeAnswerText(userBad);
    });
    expect(badMatches).toBe(false);
  });

  it("ensures zero Chinese / HSK / pinyin keys exist in exercise contracts or data", () => {
    const allText = JSON.stringify({
      grammar: DEMO_GRAMMAR_EXERCISES,
      reading: DEMO_READING_EXERCISE,
      translation: DEMO_TRANSLATION_EXERCISES,
    }).toLowerCase();

    expect(allText).not.toContain("hsk");
    expect(allText).not.toContain("pinyin");
    expect(allText).not.toContain("chinesesentence");
    expect(allText).not.toContain("zh-cn");
  });
});
