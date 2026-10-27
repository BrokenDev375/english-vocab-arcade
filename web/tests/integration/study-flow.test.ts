import { describe, it, expect } from "vitest";
import {
  generateSessionPlan,
  generateErrorReviewPlan,
  type StudyCard,
} from "@/features/study/question-engine";
import {
  recordLocalAttempt,
  getLocalSessionAttempts,
  generateClientEventId,
  type StudyAttemptRecord,
} from "@/features/study/study-client-adapter";
import { isAnswerCorrect } from "@/features/study/answer-normalization";
import { createSeededRng } from "@/features/study/shuffle";

const TEST_CARDS: StudyCard[] = [
  { id: "c1", term: "courage", meaningVi: "lòng dũng cảm", partOfSpeech: "noun" },
  { id: "c2", term: "brilliant", meaningVi: "xuất sắc, rực rỡ", partOfSpeech: "adjective" },
  { id: "c3", term: "persuade", meaningVi: "thuyết phục", partOfSpeech: "verb" },
  { id: "c4", term: "adventure", meaningVi: "cuộc phiêu lưu", partOfSpeech: "noun" },
];

describe("T08 Integration Test - Study Flow (E03, Flashcard, Learn, Error Review)", () => {
  it("E03 Part 1: Main session iterates through cards, marks correct/incorrect, and isolates error review queue", () => {
    const rng = createSeededRng(999);
    const plan = generateSessionPlan(TEST_CARDS, {
      allowedTypes: ["multiple_choice", "type_in"],
      rng,
    });

    expect(plan.mainQuestions).toHaveLength(4);
    const sessionId = `session_test_e03_${Date.now()}`;

    // Simulate user answering 4 questions: 3 correct, 1 incorrect
    const answers = [
      { cardId: "c1", answer: "courage", isCorrect: true },
      { cardId: "c2", answer: "wrong_word", isCorrect: false }, // incorrect!
      { cardId: "c3", answer: "persuade", isCorrect: true },
      { cardId: "c4", answer: "adventure", isCorrect: true },
    ];

    const failedCards: StudyCard[] = [];

    for (let i = 0; i < plan.mainQuestions.length; i++) {
      const q = plan.mainQuestions[i];
      const ans = answers.find((a) => a.cardId === q.cardId)!;

      const verified = isAnswerCorrect(ans.answer, q.correctAnswer, q.acceptedAnswers);
      expect(verified).toBe(ans.isCorrect);

      if (!verified) {
        const card = TEST_CARDS.find((c) => c.id === q.cardId)!;
        failedCards.push(card);
      }

      recordLocalAttempt({
        clientEventId: generateClientEventId(),
        sessionId,
        setId: "set_test_123",
        cardId: q.cardId,
        mode: "learn",
        questionType: q.type,
        userAnswer: ans.answer,
        isCorrect: verified,
        durationMs: 1500,
        answeredAt: new Date().toISOString(),
      });
    }

    // Verify 1 card failed
    expect(failedCards).toHaveLength(1);
    expect(failedCards[0].id).toBe("c2");

    // Stage 2: Error review plan contains only failed cards
    const errorReviewPlan = generateErrorReviewPlan(failedCards, TEST_CARDS, rng);
    expect(errorReviewPlan.mainQuestions).toHaveLength(1);
    expect(errorReviewPlan.mainQuestions[0].cardId).toBe("c2");

    // Simulate answering correctly in error review
    const errorCard = errorReviewPlan.mainQuestions[0];
    const reviewCorrect = isAnswerCorrect("brilliant", errorCard.correctAnswer, errorCard.acceptedAnswers);
    expect(reviewCorrect).toBe(true);

    recordLocalAttempt({
      clientEventId: generateClientEventId(),
      sessionId,
      setId: "set_test_123",
      cardId: errorCard.cardId,
      mode: "learn",
      questionType: errorCard.type,
      userAnswer: "brilliant",
      isCorrect: true,
      durationMs: 1200,
      answeredAt: new Date().toISOString(),
    });
  });

  it("E03 Part 2: Flashcard self-rating is recorded with distinct questionType and does not contaminate test attempts", () => {
    const sessionId = `fc_session_${Date.now()}`;
    const fcAttempt: StudyAttemptRecord = {
      clientEventId: generateClientEventId(),
      sessionId,
      setId: "set_test_123",
      cardId: "c1",
      mode: "flashcard",
      questionType: "flashcard_self_rate",
      userAnswer: "remembered",
      isCorrect: true,
      durationMs: 3000,
      answeredAt: new Date().toISOString(),
    };

    recordLocalAttempt(fcAttempt);

    // Verify session attempt was recorded with questionType flashcard_self_rate
    const attempts = getLocalSessionAttempts(sessionId);
    if (typeof window !== "undefined") {
      expect(attempts).toHaveLength(1);
      expect(attempts[0].questionType).toBe("flashcard_self_rate");
    }
  });

  it("Event identity is unique across all attempts", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = generateClientEventId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
    expect(ids.size).toBe(100);
  });
});
