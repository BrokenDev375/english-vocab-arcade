/**
 * Pure TypeScript Answer Normalization for English Vocabulary Learning.
 * - Trims and lowercases
 * - Collapses redundant whitespace
 * - Normalizes quotes (curly apostrophes to straight)
 * - Strips trailing punctuation (. ? ! , ;)
 * - Preserves essential hyphens and intra-word apostrophes
 */
export function normalizeAnswer(input: string): string {
  if (!input) return "";

  return input
    .toLowerCase()
    .trim()
    .replace(/[‘’]/g, "'") // Normalize curly apostrophes
    .replace(/[“”]/g, '"') // Normalize curly quotes
    .replace(/[\t\r\n]+/g, " ") // Collapse whitespace
    .replace(/\s+/g, " ")
    .replace(/[.?!,;:]+$/g, "") // Strip trailing punctuation
    .trim();
}

/**
 * Check if the user's answer is correct against canonical term and accepted variants.
 * Strictly checks that:
 * 1. Normalized userAnswer matches normalized canonical term, OR
 * 2. Normalized userAnswer matches any normalized item in acceptedAnswers
 */
export function isAnswerCorrect(
  userAnswer: string,
  canonicalTerm: string,
  acceptedAnswers: string[] = []
): boolean {
  const normUser = normalizeAnswer(userAnswer);
  if (!normUser) return false;

  const normCanonical = normalizeAnswer(canonicalTerm);
  if (normUser === normCanonical) {
    return true;
  }

  const allVariants = [
    canonicalTerm,
    ...acceptedAnswers,
  ];

  for (const variant of allVariants) {
    if (normUser === normalizeAnswer(variant)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix: number[][] = [];

  for (let i = 0; i <= m; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[m][n];
}

export interface MatchAnalysis {
  isCorrect: boolean;
  isExact: boolean;
  isVariant: boolean;
  isTypo: boolean; // 1 edit away for words >= 5 letters
  similarity: number; // 0 to 1
  suggestedTerm: string;
}

/**
 * Detailed match analysis for feedback
 */
export function evaluateAnswer(
  userAnswer: string,
  canonicalTerm: string,
  acceptedAnswers: string[] = []
): MatchAnalysis {
  const normUser = normalizeAnswer(userAnswer);
  const normCanonical = normalizeAnswer(canonicalTerm);

  if (normUser === normCanonical) {
    return {
      isCorrect: true,
      isExact: true,
      isVariant: false,
      isTypo: false,
      similarity: 1.0,
      suggestedTerm: canonicalTerm,
    };
  }

  for (const variant of acceptedAnswers) {
    if (normUser === normalizeAnswer(variant)) {
      return {
        isCorrect: true,
        isExact: false,
        isVariant: true,
        isTypo: false,
        similarity: 1.0,
        suggestedTerm: variant,
      };
    }
  }

  // Check if typo (distance = 1 for terms of length >= 5)
  const dist = levenshteinDistance(normUser, normCanonical);
  const maxLen = Math.max(normUser.length, normCanonical.length);
  const similarity = maxLen > 0 ? (maxLen - dist) / maxLen : 0;
  const isTypo = dist === 1 && normCanonical.length >= 5;

  return {
    isCorrect: false,
    isExact: false,
    isVariant: false,
    isTypo,
    similarity: Math.max(0, similarity),
    suggestedTerm: canonicalTerm,
  };
}
