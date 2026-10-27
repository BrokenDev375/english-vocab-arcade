import { describe, it, expect } from "vitest";
import { shuffle, createSeededRng } from "@/features/study/shuffle";
import {
  normalizeAnswer,
  isAnswerCorrect,
  evaluateAnswer,
} from "@/features/study/answer-normalization";
import {
  calculateNextReview,
  isCardDue,
  INTERVALS_SECONDS,
} from "@/features/study/review-scheduler";
import {
  generateQuestionForCard,
  generateSessionPlan,
  generateErrorReviewPlan,
  pickDistractors,
  createScrambleTokens,
  type StudyCard,
} from "@/features/study/question-engine";
import {
  RecordAttemptRequestSchema,
  CreateSessionRequestSchema,
} from "@/features/study/study.schema";

const SAMPLE_CARDS: StudyCard[] = [
  { id: "c1", term: "apple", meaningVi: "quả táo", partOfSpeech: "noun", acceptedAnswers: ["an apple"] },
  { id: "c2", term: "banana", meaningVi: "quả chuối", partOfSpeech: "noun" },
  { id: "c3", term: "orange", meaningVi: "quả cam", partOfSpeech: "noun" },
  { id: "c4", term: "grape", meaningVi: "quả nho", partOfSpeech: "noun" },
  { id: "c5", term: "watermelon", meaningVi: "quả dưa hấu", partOfSpeech: "noun" },
];

describe("T07 - Normalize và Question Engine (U01, U04-U08, U18)", () => {
  describe("U01: Shuffle seed ổn định và không mutate input", () => {
    it("shuffles deterministically with seeded RNG and does not mutate input", () => {
      const original = ["a", "b", "c", "d", "e", "f", "g"];
      const frozenInput = Object.freeze([...original]);

      const rng1 = createSeededRng(42);
      const shuffled1 = shuffle(frozenInput, rng1);

      const rng2 = createSeededRng(42);
      const shuffled2 = shuffle(frozenInput, rng2);

      // Same seed gives exact same result
      expect(shuffled1).toEqual(shuffled2);

      // Elements are permuted, not equal to original order (with high probability)
      expect(shuffled1).not.toEqual(original);

      // Every element appears exactly once
      expect([...shuffled1].sort()).toEqual([...original].sort());

      // Original array was not mutated
      expect(original).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    });
  });

  describe("U06: Answer Normalization", () => {
    it("normalizes case, whitespace, and trailing punctuation", () => {
      expect(normalizeAnswer("  Apple  ")).toBe("apple");
      expect(normalizeAnswer("hello, world!")).toBe("hello, world");
      expect(normalizeAnswer("check-in?")).toBe("check-in");
      expect(normalizeAnswer("don’t")).toBe("don't");
    });

    it("verifies cat does NOT match education", () => {
      expect(isAnswerCorrect("cat", "education")).toBe(false);
      expect(isAnswerCorrect("dog", "cat")).toBe(false);
    });

    it("evaluates typo detection accurately for words with length >= 5", () => {
      const analysis1 = evaluateAnswer("aple", "apple"); // 1 edit away, length 5
      expect(analysis1.isCorrect).toBe(false);
      expect(analysis1.isTypo).toBe(true);

      const analysis2 = evaluateAnswer("banana", "apple"); // completely different
      expect(analysis2.isCorrect).toBe(false);
      expect(analysis2.isTypo).toBe(false);
    });
  });

  describe("U07: Variants and accepted answers", () => {
    it("accepts declared variants and contractions in acceptedAnswers", () => {
      expect(isAnswerCorrect("an apple", "apple", ["an apple"])).toBe(true);
      expect(isAnswerCorrect("color", "colour", ["color"])).toBe(true);
      expect(isAnswerCorrect("cannot", "can't", ["cannot"])).toBe(true);

      // Reject variants that are NOT in acceptedAnswers
      expect(isAnswerCorrect("orange", "apple", ["an apple"])).toBe(false);
    });
  });

  describe("U04: Multiple-choice generator and distractors", () => {
    it("generates 4 unique options with distractors from pool", () => {
      const rng = createSeededRng(12345);
      const question = generateQuestionForCard(SAMPLE_CARDS[0], SAMPLE_CARDS, "multiple_choice", rng);

      expect(question.type).toBe("multiple_choice");
      expect(question.options).toHaveLength(4);

      // 1 correct option
      const correctOptions = question.options!.filter((o) => o.isCorrect);
      expect(correctOptions).toHaveLength(1);
      expect(correctOptions[0].label).toBe("apple");

      // 3 unique distractors
      const labels = question.options!.map((o) => o.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(4);
    });

    it("distributes correct option position across different runs without fixed bias", () => {
      const positionsCount = [0, 0, 0, 0];
      for (let i = 0; i < 40; i++) {
        const rng = createSeededRng(i * 100 + 7);
        const q = generateQuestionForCard(SAMPLE_CARDS[0], SAMPLE_CARDS, "multiple_choice", rng);
        const correctIdx = q.options!.findIndex((o) => o.isCorrect);
        positionsCount[correctIdx]++;
      }

      // Every position (0, 1, 2, 3) was selected at least once
      for (let p = 0; p < 4; p++) {
        expect(positionsCount[p]).toBeGreaterThan(0);
      }
    });
  });

  describe("U05: Distractor generation when pool has few cards", () => {
    it("handles 3-card pool by generating 3 options without creating fake options", () => {
      const smallPool = SAMPLE_CARDS.slice(0, 3);
      const q = generateQuestionForCard(smallPool[0], smallPool, "multiple_choice");

      expect(q.options).toHaveLength(3);
      expect(q.options!.filter((o) => o.isCorrect)).toHaveLength(1);
    });

    it("handles 2-card pool by generating 2 options", () => {
      const twoCards = SAMPLE_CARDS.slice(0, 2);
      const q = generateQuestionForCard(twoCards[0], twoCards, "multiple_choice");

      expect(q.options).toHaveLength(2);
      expect(q.options!.filter((o) => o.isCorrect)).toHaveLength(1);
    });

    it("handles 1-card pool by falling back to type_in without crashing", () => {
      const singleCard = [SAMPLE_CARDS[0]];
      const q = generateQuestionForCard(singleCard[0], singleCard, "multiple_choice");

      // Gracefully falls back to type_in
      expect(q.type).toBe("type_in");
      expect(q.options).toBeUndefined();
      expect(q.correctAnswer).toBe("apple");
    });

    it("scramble generator produces shuffled tokens", () => {
      const tokens = createScrambleTokens("apple");
      expect(tokens).toHaveLength(5);

      const phraseTokens = createScrambleTokens("good morning");
      expect(phraseTokens).toHaveLength(2);

      const q = generateQuestionForCard(SAMPLE_CARDS[0], SAMPLE_CARDS, "scramble");
      expect(q.type).toBe("scramble");
      expect(q.scrambleTokens).toBeDefined();
      expect(q.scrambleTokens!).toHaveLength(5); // "apple" -> 5 letters
    });

    it("pickDistractors returns unique distractors without duplicating target card", () => {
      const distractors = pickDistractors(SAMPLE_CARDS[0], SAMPLE_CARDS, 2);
      expect(distractors).toHaveLength(2);
      expect(distractors.every((d) => d.id !== SAMPLE_CARDS[0].id)).toBe(true);
    });
  });

  describe("U08: Review Scheduler and Session Plan", () => {
    it("increases intervals progressively on correct answers", () => {
      const t0 = new Date("2026-10-26T12:00:00Z");

      // 0 -> 1 (10 minutes)
      const r1 = calculateNextReview(0, true, t0);
      expect(r1.nextStreak).toBe(1);
      expect(r1.intervalSeconds).toBe(INTERVALS_SECONDS[0]); // 600s
      expect(r1.dueAt.toISOString()).toBe("2026-10-26T12:10:00.000Z");

      // 1 -> 2 (1 day)
      const r2 = calculateNextReview(1, true, t0);
      expect(r2.nextStreak).toBe(2);
      expect(r2.intervalSeconds).toBe(INTERVALS_SECONDS[1]); // 86400s
      expect(r2.dueAt.toISOString()).toBe("2026-10-27T12:00:00.000Z");

      // 2 -> 3 (3 days)
      const r3 = calculateNextReview(2, true, t0);
      expect(r3.nextStreak).toBe(3);
      expect(r3.intervalSeconds).toBe(INTERVALS_SECONDS[2]); // 259200s
      expect(r3.dueAt.toISOString()).toBe("2026-10-29T12:00:00.000Z");

      // 3 -> 4 (7 days)
      const r4 = calculateNextReview(3, true, t0);
      expect(r4.nextStreak).toBe(4);
      expect(r4.intervalSeconds).toBe(INTERVALS_SECONDS[3]); // 604800s
      expect(r4.dueAt.toISOString()).toBe("2026-11-02T12:00:00.000Z");

      // 4 -> 5 (14 days)
      const r5 = calculateNextReview(4, true, t0);
      expect(r5.nextStreak).toBe(5);
      expect(r5.intervalSeconds).toBe(INTERVALS_SECONDS[4]); // 1209600s
      expect(r5.dueAt.toISOString()).toBe("2026-11-09T12:00:00.000Z");

      // 5 -> 6 (30 days cap)
      const r6 = calculateNextReview(5, true, t0);
      expect(r6.nextStreak).toBe(6);
      expect(r6.intervalSeconds).toBe(INTERVALS_SECONDS[5]); // 2592000s
      expect(r6.dueAt.toISOString()).toBe("2026-11-25T12:00:00.000Z");
    });

    it("resets streak to 0 and schedules due in 10 minutes on wrong answer", () => {
      const t0 = new Date("2026-10-26T12:00:00Z");
      const r = calculateNextReview(5, false, t0);

      expect(r.nextStreak).toBe(0);
      expect(r.intervalSeconds).toBe(600); // 10 minutes
      expect(r.dueAt.toISOString()).toBe("2026-10-26T12:10:00.000Z");
    });

    it("isCardDue correctly identifies due vs future cards", () => {
      const now = new Date("2026-10-26T12:00:00Z");
      const past = new Date("2026-10-26T11:00:00Z");
      const future = new Date("2026-10-26T13:00:00Z");

      expect(isCardDue(null, now)).toBe(true); // never studied is due
      expect(isCardDue(past, now)).toBe(true);
      expect(isCardDue(future, now)).toBe(false);
    });

    it("session plan generates one question per card without repeats", () => {
      const plan = generateSessionPlan(SAMPLE_CARDS);
      expect(plan.mainQuestions).toHaveLength(5);

      const cardIdsInPlan = plan.mainQuestions.map((q) => q.cardId);
      const uniqueCardIds = new Set(cardIdsInPlan);
      expect(uniqueCardIds.size).toBe(5);
    });

    it("error review plan only contains failed cards", () => {
      const failed = [SAMPLE_CARDS[1], SAMPLE_CARDS[3]];
      const errorPlan = generateErrorReviewPlan(failed, SAMPLE_CARDS);

      expect(errorPlan.mainQuestions).toHaveLength(2);
      expect(errorPlan.mainQuestions.map((q) => q.cardId).sort()).toEqual(["c2", "c4"]);
    });
  });

  describe("U18: API Request Schema Validation", () => {
    it("validates a correct attempt request payload", () => {
      const validPayload = {
        sessionId: "11111111-1111-4111-8111-111111111111",
        setId: "22222222-2222-4222-8222-222222222222",
        cardId: "33333333-3333-4333-8333-333333333333",
        mode: "learn",
        questionType: "multiple_choice",
        userAnswer: "apple",
        isCorrect: true,
        durationMs: 3200,
        clientEventId: "evt_123456",
      };

      const parsed = RecordAttemptRequestSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
    });

    it("rejects negative durationMs", () => {
      const invalidPayload = {
        sessionId: "11111111-1111-4111-8111-111111111111",
        setId: "22222222-2222-4222-8222-222222222222",
        cardId: "33333333-3333-4333-8333-333333333333",
        mode: "learn",
        questionType: "multiple_choice",
        isCorrect: true,
        durationMs: -50, // Negative duration!
        clientEventId: "evt_123",
      };

      const parsed = RecordAttemptRequestSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });

    it("rejects unknown study mode", () => {
      const invalidPayload = {
        setId: "22222222-2222-4222-8222-222222222222",
        mode: "alien_mode",
      };

      const parsed = CreateSessionRequestSchema.safeParse(invalidPayload);
      expect(parsed.success).toBe(false);
    });
  });
});
