import { shuffle, type RngFunction } from "./shuffle";

export type QuestionType = "multiple_choice" | "type_in" | "scramble";

export interface StudyCard {
  id: string;
  term: string;
  meaningVi: string;
  partOfSpeech?: string | null;
  ipa?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  acceptedAnswers?: string[];
}

export interface QuestionOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface StudyQuestion {
  id: string;
  cardId: string;
  type: QuestionType;
  prompt: string;
  subPrompt?: string;
  correctAnswer: string;
  acceptedAnswers: string[];
  options?: QuestionOption[]; // for multiple_choice
  scrambleTokens?: string[]; // for scramble
  explanation?: string;
}

export interface QuestionEngineOptions {
  allowedTypes?: QuestionType[];
  maxQuestions?: number;
  rng?: RngFunction;
}

/**
 * Split a term into scramble tokens.
 * Single word -> letter tokens.
 * Multiple words/phrase -> word tokens.
 */
export function createScrambleTokens(term: string, rng: RngFunction = Math.random): string[] {
  const trimmed = term.trim();
  const words = trimmed.split(/\s+/);

  let tokens: string[];
  if (words.length > 1) {
    tokens = words;
  } else {
    tokens = trimmed.split("");
  }

  // Ensure shuffled tokens do not match original string immediately if possible
  const shuffled = shuffle(tokens, rng);
  return shuffled;
}

/**
 * Generate distractors for a multiple-choice question.
 * Only picks from real cards in the pool with distinct meanings/terms.
 * Returns up to maxDistractors (usually 3).
 * If pool has fewer cards, returns as many unique distractors as available without duplicating.
 */
export function pickDistractors(
  targetCard: StudyCard,
  pool: readonly StudyCard[],
  maxDistractors = 3,
  rng: RngFunction = Math.random
): StudyCard[] {
  // Filter out target card and any cards with identical term or meaning
  const candidates = pool.filter(
    (c) =>
      c.id !== targetCard.id &&
      c.term.trim().toLowerCase() !== targetCard.term.trim().toLowerCase() &&
      c.meaningVi.trim().toLowerCase() !== targetCard.meaningVi.trim().toLowerCase()
  );

  const shuffledCandidates = shuffle(candidates, rng);
  return shuffledCandidates.slice(0, maxDistractors);
}

/**
 * Generate a single question for a target card given the available pool.
 */
export function generateQuestionForCard(
  targetCard: StudyCard,
  pool: readonly StudyCard[],
  preferredType: QuestionType = "multiple_choice",
  rng: RngFunction = Math.random
): StudyQuestion {
  const questionId = `q_${targetCard.id}_${preferredType}`;

  // Check if multiple-choice is viable
  if (preferredType === "multiple_choice") {
    const distractors = pickDistractors(targetCard, pool, 3, rng);

    // If no distractors exist at all (pool size = 1), fallback to type_in
    if (distractors.length === 0) {
      return {
        id: `q_${targetCard.id}_type_in`,
        cardId: targetCard.id,
        type: "type_in",
        prompt: targetCard.meaningVi,
        subPrompt: targetCard.ipa ? `Phát âm: ${targetCard.ipa}` : undefined,
        correctAnswer: targetCard.term,
        acceptedAnswers: targetCard.acceptedAnswers || [targetCard.term],
        explanation: targetCard.exampleEn || undefined,
      };
    }

    // Build options (1 correct + available distractors, 2 to 4 options total)
    const rawOptions: QuestionOption[] = [
      { id: `opt_${targetCard.id}`, label: targetCard.term, isCorrect: true },
      ...distractors.map((d) => ({
        id: `opt_${d.id}`,
        label: d.term,
        isCorrect: false,
      })),
    ];

    const shuffledOptions = shuffle(rawOptions, rng);

    return {
      id: questionId,
      cardId: targetCard.id,
      type: "multiple_choice",
      prompt: targetCard.meaningVi,
      subPrompt: targetCard.partOfSpeech ? `Loại từ: ${targetCard.partOfSpeech}` : undefined,
      correctAnswer: targetCard.term,
      acceptedAnswers: targetCard.acceptedAnswers || [targetCard.term],
      options: shuffledOptions,
      explanation: targetCard.exampleEn || undefined,
    };
  }

  if (preferredType === "scramble") {
    const tokens = createScrambleTokens(targetCard.term, rng);
    return {
      id: questionId,
      cardId: targetCard.id,
      type: "scramble",
      prompt: targetCard.meaningVi,
      subPrompt: targetCard.partOfSpeech ? `Loại từ: ${targetCard.partOfSpeech}` : undefined,
      correctAnswer: targetCard.term,
      acceptedAnswers: targetCard.acceptedAnswers || [targetCard.term],
      scrambleTokens: tokens,
      explanation: targetCard.exampleEn || undefined,
    };
  }

  // Fallback to type_in
  return {
    id: questionId,
    cardId: targetCard.id,
    type: "type_in",
    prompt: targetCard.meaningVi,
    subPrompt: targetCard.ipa ? `Phát âm: ${targetCard.ipa}` : undefined,
    correctAnswer: targetCard.term,
    acceptedAnswers: targetCard.acceptedAnswers || [targetCard.term],
    explanation: targetCard.exampleEn || undefined,
  };
}

export interface SessionPlan {
  mainQuestions: StudyQuestion[];
  totalQuestions: number;
}

/**
 * Generate a full session questions plan from a card pool.
 * Does not repeat cards in the main stage.
 */
export function generateSessionPlan(
  cards: readonly StudyCard[],
  options: QuestionEngineOptions = {}
): SessionPlan {
  if (cards.length === 0) {
    return { mainQuestions: [], totalQuestions: 0 };
  }

  const {
    allowedTypes = ["multiple_choice", "type_in"],
    maxQuestions,
    rng = Math.random,
  } = options;

  const shuffledCards = shuffle(cards, rng);
  const selectedCards = maxQuestions ? shuffledCards.slice(0, maxQuestions) : shuffledCards;

  const mainQuestions = selectedCards.map((card, idx) => {
    // Distribute question types evenly across allowedTypes
    const typeIndex = idx % allowedTypes.length;
    const qType = allowedTypes[typeIndex];
    return generateQuestionForCard(card, cards, qType, rng);
  });

  return {
    mainQuestions,
    totalQuestions: mainQuestions.length,
  };
}

/**
 * Generate an error review session for only the failed cards.
 */
export function generateErrorReviewPlan(
  failedCards: readonly StudyCard[],
  allCardsPool: readonly StudyCard[],
  rng: RngFunction = Math.random
): SessionPlan {
  if (failedCards.length === 0) {
    return { mainQuestions: [], totalQuestions: 0 };
  }

  // In error review, use type_in or multiple_choice to ensure active recall
  const shuffledFailed = shuffle(failedCards, rng);
  const mainQuestions = shuffledFailed.map((card) =>
    generateQuestionForCard(card, allCardsPool, "type_in", rng)
  );

  return {
    mainQuestions,
    totalQuestions: mainQuestions.length,
  };
}
