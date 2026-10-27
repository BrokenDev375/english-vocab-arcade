import type { ValidatedCard } from "./import-validator";
import type { NewCardInput } from "@/features/sets/sets.repository";

export const CHUNK_SIZE = 100;

export interface ImportChunk {
  chunkIndex: number;
  totalChunks: number;
  cards: NewCardInput[];
}

/**
 * Build deterministic importKey for a card in an import batch
 */
export function buildDeterministicImportKey(
  batchId: string,
  indexInBatch: number,
  term: string
): string {
  // Normalize term to create stable suffix
  const cleanTerm = term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 32);

  return `${batchId}_${indexInBatch}_${cleanTerm}`.slice(0, 100);
}

/**
 * Split validated cards into chunks of at most 100 items with deterministic importKey
 */
export function chunkValidatedCards(
  validatedCards: ValidatedCard[],
  batchId: string,
  startingPosition = 0
): ImportChunk[] {
  const chunks: ImportChunk[] = [];
  const totalCards = validatedCards.length;
  const totalChunks = Math.ceil(totalCards / CHUNK_SIZE);

  for (let c = 0; c < totalChunks; c++) {
    const start = c * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalCards);
    const chunkCards: NewCardInput[] = [];

    for (let i = start; i < end; i++) {
      const card = validatedCards[i];
      const pos = startingPosition + i;
      const importKey = buildDeterministicImportKey(batchId, i, card.term);

      chunkCards.push({
        term: card.term,
        meaningVi: card.meaningVi,
        partOfSpeech: card.partOfSpeech,
        ipa: card.ipa,
        cefrLevel: card.cefrLevel,
        exampleEn: card.exampleEn,
        exampleVi: card.exampleVi,
        acceptedAnswers: card.acceptedAnswers,
        position: pos,
        importKey,
      });
    }

    chunks.push({
      chunkIndex: c,
      totalChunks,
      cards: chunkCards,
    });
  }

  return chunks;
}
