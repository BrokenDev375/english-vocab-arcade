/**
 * Deterministic Fisher-Yates Shuffle with injectable RNG.
 * Does not mutate the source array.
 */
export type RngFunction = () => number;

/**
 * Creates a simple deterministic pseudorandom number generator (Mulberry32) for testing.
 */
export function createSeededRng(seed: number): RngFunction {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pure Fisher-Yates shuffle algorithm.
 * Guarantees every element appears exactly once without mutating the original input.
 */
export function shuffle<T>(array: readonly T[], rng: RngFunction = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
