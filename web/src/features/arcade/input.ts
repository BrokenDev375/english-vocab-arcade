import type { ArcadeCard } from "./types";

/**
 * Normalizes input text according to docs/05 Section 5:
 * - Unicode NFKC
 * - Lowercase
 * - Convert curly apostrophes (’ / ‘) to ASCII single quote (')
 * - Collapse multiple spaces into single space
 * - Retain hyphens and quotes
 */
export function normalizeArcadeText(input: string): string {
  if (!input) return "";

  return input
    .normalize("NFKC")
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalizes the buffer incrementally as the user types.
 * We do not trim internal spaces, only normalize quotes and collapse spaces.
 */
export function normalizeBufferIncremental(input: string): string {
  if (!input) return "";

  return input
    .normalize("NFKC")
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Validates whether a card is eligible for the Arcade game according to docs/05 Section 3:
 * - Term and accepted answers: 1–40 characters
 * - Only Latin ASCII letters, spaces, hyphens, and single quotes
 * - Meaning must not be empty
 */
const ELIGIBLE_TERM_REGEX = /^[a-zA-Z0-9\s'\-]+$/;

export function isCardEligible(card: ArcadeCard): boolean {
  if (!card.term || !card.meaningVi) return false;
  if (card.meaningVi.trim().length === 0) return false;

  const normTerm = normalizeArcadeText(card.term);
  if (normTerm.length < 1 || normTerm.length > 40) return false;
  if (!ELIGIBLE_TERM_REGEX.test(normTerm)) return false;

  // Check accepted answers if any
  if (card.acceptedAnswers && card.acceptedAnswers.length > 0) {
    for (const ans of card.acceptedAnswers) {
      const normAns = normalizeArcadeText(ans);
      if (normAns.length < 1 || normAns.length > 40) return false;
      if (!ELIGIBLE_TERM_REGEX.test(normAns)) return false;
    }
  }

  return true;
}

/**
 * Filters a card list for eligibility and returns { eligible, rejectedCount }.
 */
export function filterEligibleCards(cards: readonly ArcadeCard[]): {
  eligible: ArcadeCard[];
  rejectedCount: number;
} {
  const eligible: ArcadeCard[] = [];
  let rejectedCount = 0;

  // Deduplicate by card ID
  const seenIds = new Set<string>();

  for (const c of cards) {
    if (seenIds.has(c.id)) {
      continue;
    }
    seenIds.add(c.id);

    if (isCardEligible(c)) {
      eligible.push(c);
    } else {
      rejectedCount++;
    }
  }

  return { eligible, rejectedCount };
}

/**
 * Checks if a candidate buffer is a valid prefix of at least one answer variant.
 */
export function matchesAnswerPrefix(buffer: string, variants: readonly string[]): boolean {
  if (!buffer) return false;
  const norm = normalizeBufferIncremental(buffer);
  return variants.some((v) => v.startsWith(norm));
}

/**
 * Checks if a candidate buffer exactly matches at least one answer variant.
 */
export function matchesExactAnswer(buffer: string, variants: readonly string[]): boolean {
  if (!buffer) return false;
  const norm = normalizeArcadeText(buffer);
  return variants.some((v) => v === norm);
}
