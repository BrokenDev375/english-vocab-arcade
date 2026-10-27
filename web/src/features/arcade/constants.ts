/**
 * Constants for the Word Blaster Arcade Engine according to docs/05.
 */

export const ARCADE_CONSTANTS = {
  DEFAULT_LIVES: 3,
  CARDS_PER_STAGE: 10,
  MAX_ACTIVE_TARGETS_STAGE_0: 2,
  MAX_ACTIVE_TARGETS_STAGE_LATER: 3,

  BASE_HIT_SCORE: 100,
  MAX_SPEED_BONUS: 40,

  FIXED_TIMESTEP_MS: 16.6667,
  MAX_FRAME_GAP_MS: 250,

  HINT_1_PROGRESS: 0.65,
  HINT_2_PROGRESS: 0.85,

  MAX_LANES: 3,

  getSpawnIntervalMs(stageIndex: number): number {
    return Math.max(900, 1600 - stageIndex * 100);
  },

  getFlightTimeMs(answerLength: number, stageIndex: number): number {
    const raw = 11000 + 500 * answerLength - 700 * stageIndex;
    return Math.min(24000, Math.max(8000, raw));
  },

  getSpeedBonus(remainingFlightFraction: number): number {
    const fraction = Math.max(0, Math.min(1, remainingFlightFraction));
    return Math.floor(40 * fraction);
  },

  getMaxActiveTargets(stageIndex: number): number {
    return stageIndex === 0 ? 2 : 3;
  },
} as const;
