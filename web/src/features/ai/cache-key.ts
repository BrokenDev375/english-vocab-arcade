import { createHash } from "node:crypto";
import type { AiMode } from "./schemas";
import type { TargetCardInfo } from "./service.server";
export const CURRENT_PROMPT_VERSION = "2026-10-v1";
export const CURRENT_SCHEMA_VERSION = "2026-10-v1";

export interface ComputeCacheKeyParams {
  userId: string;
  setId: string;
  contentRevision: number;
  mode: AiMode;
  cards: TargetCardInfo[];
  targetLevel: string;
  promptVersion?: string;
  schemaVersion?: string;
  nonce?: number;
}

/**
 * Computes canonical SHA-256 hash key for AI batch caching.
 * Cards are sorted by ID to prevent permutation mismatches.
 */
export function computeAiCacheKey(params: ComputeCacheKeyParams): string {
  const {
    userId,
    setId,
    contentRevision,
    mode,
    cards,
    targetLevel,
    promptVersion = CURRENT_PROMPT_VERSION,
    schemaVersion = CURRENT_SCHEMA_VERSION,
    nonce = 0,
  } = params;

  // Sort cards canonically by id
  const canonicalCards = [...cards]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => ({
      id: c.id,
      term: c.term.trim().toLowerCase(),
      meaningVi: c.meaningVi.trim(),
      partOfSpeech: c.partOfSpeech,
      cefrLevel: c.cefrLevel || targetLevel,
    }));

  const payload = {
    userId,
    setId,
    contentRevision,
    mode,
    cards: canonicalCards,
    targetLevel,
    promptVersion,
    schemaVersion,
    nonce,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
