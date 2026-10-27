import { calculateNextReview } from "./review-scheduler";

export interface StudyAttemptRecord {
  clientEventId: string;
  sessionId: string;
  setId: string;
  cardId: string;
  mode: "flashcard" | "learn" | "test" | "match" | "arcade";
  questionType:
    | "flashcard_self_rate"
    | "multiple_choice"
    | "type_in"
    | "scramble"
    | "match"
    | "arcade_typing"
    | "arcade_recall";
  userAnswer: string;
  isCorrect: boolean;
  durationMs: number;
  answeredAt: string;
}

export interface LocalCardProgress {
  cardId: string;
  correctStreak: number;
  totalAttempts: number;
  correctAttempts: number;
  lastStudiedAt: string;
  dueAt: string;
}

export interface LocalSessionBackup {
  schemaVersion: 1;
  sessionId: string;
  userIdOrGuest: string;
  setId: string;
  mode: string;
  baseServerVersion: number;
  savedAt: string;
  state: Record<string, unknown>;
  pendingAttempts: StudyAttemptRecord[];
}

/**
 * Generate a unique clientEventId for idempotent attempt recording.
 */
export function generateClientEventId(): string {
  // Use crypto.randomUUID() if available, otherwise generate a secure fallback
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const randomHex = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-4000-8000-${randomHex.slice(0, 12)}`;
}

const STORAGE_PREFIX = "eva_study_";

/**
 * Builds user-scoped local backup key according to docs/04 Section 6:
 * eva:v1:<user-id-or-guest>:<set-id>:<mode>:<session-id>
 */
export function buildLocalBackupKey(
  userIdOrGuest: string,
  setId: string,
  mode: string,
  sessionId: string
): string {
  return `eva:v1:${userIdOrGuest}:${setId}:${mode}:${sessionId}`;
}

/**
 * Saves a session state backup locally to prevent data loss.
 */
export function saveLocalSessionBackup(backup: LocalSessionBackup): void {
  if (typeof window === "undefined") return;
  const key = buildLocalBackupKey(
    backup.userIdOrGuest,
    backup.setId,
    backup.mode,
    backup.sessionId
  );
  try {
    localStorage.setItem(key, JSON.stringify(backup));
  } catch (err) {
    console.warn("Could not save local session backup", err);
  }
}

/**
 * Retrieves a session state backup from localStorage.
 */
export function getLocalSessionBackup(
  userIdOrGuest: string,
  setId: string,
  mode: string,
  sessionId: string
): LocalSessionBackup | null {
  if (typeof window === "undefined") return null;
  const key = buildLocalBackupKey(userIdOrGuest, setId, mode, sessionId);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clears user-scoped session data on logout.
 */
export function clearUserLocalData(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const prefix = `eva:v1:${userId}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch (err) {
    console.warn("Could not clear user local data", err);
  }
}

/**
 * Save attempt to local persistence queue (idempotent by clientEventId).
 */
export function recordLocalAttempt(attempt: StudyAttemptRecord): void {
  if (typeof window === "undefined") return;

  const key = `${STORAGE_PREFIX}attempts_${attempt.sessionId}`;
  try {
    const raw = localStorage.getItem(key);
    const existing: StudyAttemptRecord[] = raw ? JSON.parse(raw) : [];

    // Idempotency check: do not add if clientEventId already recorded
    if (existing.some((a) => a.clientEventId === attempt.clientEventId)) {
      return;
    }

    existing.push(attempt);
    localStorage.setItem(key, JSON.stringify(existing));

    // Also update local card SRS progress
    updateLocalCardProgress(attempt);
  } catch (err) {
    console.warn("Could not save attempt to localStorage", err);
  }
}

/**
 * Update SRS progress in localStorage.
 */
export function updateLocalCardProgress(attempt: StudyAttemptRecord): void {
  if (typeof window === "undefined") return;

  // Do not count flashcard self-rating as verified objective test attempt
  if (attempt.questionType === "flashcard_self_rate") {
    return;
  }

  const key = `${STORAGE_PREFIX}progress_${attempt.setId}`;
  try {
    const raw = localStorage.getItem(key);
    const progressMap: Record<string, LocalCardProgress> = raw ? JSON.parse(raw) : {};

    const current = progressMap[attempt.cardId] || {
      cardId: attempt.cardId,
      correctStreak: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      lastStudiedAt: new Date().toISOString(),
      dueAt: new Date().toISOString(),
    };

    const nextSchedule = calculateNextReview(
      current.correctStreak,
      attempt.isCorrect,
      new Date(attempt.answeredAt)
    );

    progressMap[attempt.cardId] = {
      cardId: attempt.cardId,
      correctStreak: nextSchedule.nextStreak,
      totalAttempts: current.totalAttempts + 1,
      correctAttempts: current.correctAttempts + (attempt.isCorrect ? 1 : 0),
      lastStudiedAt: attempt.answeredAt,
      dueAt: nextSchedule.dueAt.toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(progressMap));
  } catch (err) {
    console.warn("Could not update card progress in localStorage", err);
  }
}

/**
 * Get all attempts for a session.
 */
export function getLocalSessionAttempts(sessionId: string): StudyAttemptRecord[] {
  if (typeof window === "undefined") return [];
  const key = `${STORAGE_PREFIX}attempts_${sessionId}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
