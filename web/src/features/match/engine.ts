import { shuffle, type RngFunction } from "../study/shuffle";

export const MAX_PAIRS_PER_STAGE = 6;

export interface MatchCard {
  id: string;
  term: string;
  meaningVi: string;
}

export interface MatchTile {
  id: string;
  cardId: string;
  type: "term" | "meaning";
  text: string;
}

export interface MatchStage {
  stageIndex: number;
  totalStages: number;
  cards: MatchCard[];
  tiles: MatchTile[];
}

export interface MatchSessionPlan {
  stages: MatchStage[];
  totalPairs: number;
}

/**
 * Normalizes text for collision comparison.
 */
function normalizeKey(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Ensures no single stage has cards that share identical terms or identical meanings,
 * by swapping conflicting cards with subsequent stages where possible.
 */
export function resolveStageConflicts(stages: MatchCard[][]): MatchCard[][] {
  const result: MatchCard[][] = stages.map((s) => [...s]);

  for (let sIdx = 0; sIdx < result.length; sIdx++) {
    const current = result[sIdx];

    for (let i = 0; i < current.length; i++) {
      const cardA = current[i];
      const termA = normalizeKey(cardA.term);
      const meanA = normalizeKey(cardA.meaningVi);

      // Check if there is another card in the same stage with duplicate term or meaning
      const conflictIdx = current.findIndex(
        (cardB, idx) =>
          idx > i &&
          (normalizeKey(cardB.term) === termA || normalizeKey(cardB.meaningVi) === meanA)
      );

      if (conflictIdx !== -1) {
        // Try to swap conflict card with a non-conflicting card from a later stage
        let swapped = false;
        for (let otherStageIdx = sIdx + 1; otherStageIdx < result.length; otherStageIdx++) {
          const otherStage = result[otherStageIdx];

          for (let oIdx = 0; oIdx < otherStage.length; oIdx++) {
            const candidate = otherStage[oIdx];
            const candTerm = normalizeKey(candidate.term);
            const candMean = normalizeKey(candidate.meaningVi);

            // Verify candidate does not conflict with current stage
            const candidateCausesConflictInCurrent = current.some(
              (c, cIdx) =>
                cIdx !== conflictIdx &&
                (normalizeKey(c.term) === candTerm || normalizeKey(c.meaningVi) === candMean)
            );

            // Verify conflicted card does not conflict in other stage
            const conflictCardCausesConflictInOther = otherStage.some(
              (c, cIdx) =>
                cIdx !== oIdx &&
                (normalizeKey(c.term) === normalizeKey(current[conflictIdx].term) ||
                  normalizeKey(c.meaningVi) === normalizeKey(current[conflictIdx].meaningVi))
            );

            if (!candidateCausesConflictInCurrent && !conflictCardCausesConflictInOther) {
              const temp = current[conflictIdx];
              current[conflictIdx] = candidate;
              otherStage[oIdx] = temp;
              swapped = true;
              break;
            }
          }

          if (swapped) break;
        }
      }
    }
  }

  return result;
}

/**
 * Creates a complete Match session plan.
 * Shuffles all cards ONCE using Fisher-Yates with injectable RNG,
 * segments them into stages of at most 6 pairs,
 * resolves duplicate content conflicts across stages,
 * and generates randomized tiles for each stage.
 */
export function createMatchPlan(
  cards: readonly MatchCard[],
  rng: RngFunction = Math.random
): MatchSessionPlan {
  if (cards.length === 0) {
    return { stages: [], totalPairs: 0 };
  }

  // 1. Single Fisher-Yates shuffle across the entire pool
  const shuffledCards = shuffle(cards, rng);

  // 2. Chunk into stages of at most MAX_PAIRS_PER_STAGE (6)
  const rawStages: MatchCard[][] = [];
  for (let i = 0; i < shuffledCards.length; i += MAX_PAIRS_PER_STAGE) {
    rawStages.push(shuffledCards.slice(i, i + MAX_PAIRS_PER_STAGE));
  }

  // 3. Resolve potential duplicate term/meaning conflicts in the same stage
  const resolvedStages = resolveStageConflicts(rawStages);
  const totalStages = resolvedStages.length;

  // 4. Construct MatchStage objects with randomized tiles
  const stages: MatchStage[] = resolvedStages.map((stageCards, stageIndex) => {
    const rawTiles: MatchTile[] = [];

    for (const card of stageCards) {
      rawTiles.push({
        id: `tile_${card.id}_term`,
        cardId: card.id,
        type: "term",
        text: card.term,
      });
      rawTiles.push({
        id: `tile_${card.id}_meaning`,
        cardId: card.id,
        type: "meaning",
        text: card.meaningVi,
      });
    }

    // Shuffle the tiles within this stage
    const tiles = shuffle(rawTiles, rng);

    return {
      stageIndex,
      totalStages,
      cards: stageCards,
      tiles,
    };
  });

  return {
    stages,
    totalPairs: cards.length,
  };
}

/**
 * Validates whether two selected tiles represent a correct match.
 * Prevents same-tile selection, requires one term and one meaning,
 * and accepts equivalent text matches if semantic equivalents exist in the stage.
 */
export function checkMatch(
  tile1: MatchTile,
  tile2: MatchTile,
  stageCards: readonly MatchCard[]
): boolean {
  // Cannot match identical tile with itself
  if (tile1.id === tile2.id) {
    return false;
  }

  // Must be one term and one meaning
  if (tile1.type === tile2.type) {
    return false;
  }

  // Direct card match
  if (tile1.cardId === tile2.cardId) {
    return true;
  }

  // Semantic equivalence check (in case identical terms or meanings exist)
  const termText = tile1.type === "term" ? tile1.text : tile2.text;
  const meaningText = tile1.type === "meaning" ? tile1.text : tile2.text;

  const normTerm = normalizeKey(termText);
  const normMeaning = normalizeKey(meaningText);

  return stageCards.some(
    (c) => normalizeKey(c.term) === normTerm && normalizeKey(c.meaningVi) === normMeaning
  );
}
