/**
 * Spaced Repetition System (SRS) pure scheduler.
 * Implements intervals defined in docs/01:
 * - 10 minutes (streak 0 -> 1)
 * - 1 day (streak 1 -> 2)
 * - 3 days (streak 2 -> 3)
 * - 7 days (streak 3 -> 4)
 * - 14 days (streak 4 -> 5)
 * - 30 days (streak >= 5)
 * If incorrect, streak resets to 0 and due_at is set to now + 10 minutes.
 */

export const INTERVALS_SECONDS = [
  600, // 0: 10 minutes
  86400, // 1: 1 day
  259200, // 2: 3 days
  604800, // 3: 7 days
  1209600, // 4: 14 days
  2592000, // 5+: 30 days
] as const;

export interface ReviewScheduleResult {
  nextStreak: number;
  dueAt: Date;
  intervalSeconds: number;
  isDueNow: boolean;
}

/**
 * Calculate the next review due timestamp based on current streak and correctness.
 * Accepts an injectable `now` for 100% deterministic testing.
 */
export function calculateNextReview(
  currentStreak: number,
  isCorrect: boolean,
  now: Date = new Date()
): ReviewScheduleResult {
  if (!isCorrect) {
    const intervalSeconds = INTERVALS_SECONDS[0]; // 10 minutes
    const dueAt = new Date(now.getTime() + intervalSeconds * 1000);
    return {
      nextStreak: 0,
      dueAt,
      intervalSeconds,
      isDueNow: false,
    };
  }

  const nextStreak = Math.max(1, currentStreak + 1);
  const intervalIndex = Math.min(nextStreak - 1, INTERVALS_SECONDS.length - 1);
  const intervalSeconds = INTERVALS_SECONDS[intervalIndex];
  const dueAt = new Date(now.getTime() + intervalSeconds * 1000);

  return {
    nextStreak,
    dueAt,
    intervalSeconds,
    isDueNow: false,
  };
}

/**
 * Check if a card is currently due for review given its dueAt date.
 */
export function isCardDue(dueAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!dueAt) return true; // Newly added card or never studied card is immediately due
  const dueDate = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  return now.getTime() >= dueDate.getTime();
}
