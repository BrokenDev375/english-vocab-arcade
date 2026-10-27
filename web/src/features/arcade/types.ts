/**
 * Word Blaster Arcade Types based on docs/05.
 */

export type ArcadePhase =
  | "ready"
  | "running"
  | "paused"
  | "stage_complete"
  | "won"
  | "lost";

export type ArcadeMode = "typing" | "recall";

export interface ArcadeCard {
  id: string;
  term: string;
  meaningVi: string;
  acceptedAnswers?: string[];
  ipa?: string;
}

export interface ArcadeTarget {
  id: string;
  cardId: string;
  answerVariants: string[];
  canonicalAnswer: string;
  meaning: string;
  progress: number; // 0..1 flight time fraction
  flightTimeMs: number;
  spawnedAtMs: number;
  lane: number;
  hintUsed: boolean;
  resolved: boolean;
  hintText?: string;
}

export interface ArcadeGameState {
  phase: ArcadePhase;
  mode: ArcadeMode;
  seed: string;
  orderedCardIds: string[];
  stageIndex: number;
  spawnCursor: number;
  activeTargets: ArcadeTarget[];
  lockedTargetId: string | null;
  typedBuffer: string;
  lives: number;
  score: number;
  elapsedMs: number;
  wrongKeyCount: number;
  hitIds: string[];
  missedIds: string[];
  hintedIds: string[];
  timeSinceLastSpawnMs: number;
}

export type ArcadeEventType =
  | "TARGET_HIT"
  | "TARGET_MISSED"
  | "STAGE_COMPLETED"
  | "GAME_WON"
  | "GAME_LOST"
  | "GAME_PAUSED"
  | "TARGET_SPAWNED"
  | "TARGET_LOCKED"
  | "TARGET_UNLOCKED"
  | "WRONG_KEY";

export interface ArcadeEvent {
  id: string;
  type: ArcadeEventType;
  timestampMs: number;
  payload?: {
    targetId?: string;
    cardId?: string;
    canonicalAnswer?: string;
    scoreAdded?: number;
    speedBonus?: number;
    hintUsed?: boolean;
    reason?: string;
    remainingLives?: number;
    stageIndex?: number;
    totalStages?: number;
    totalScore?: number;
    char?: string;
    lockedTargetId?: string;
  };
}

export interface SavedArcadeState {
  version: 1;
  phase: ArcadePhase;
  mode: ArcadeMode;
  seed: string;
  orderedCardIds: string[];
  stageIndex: number;
  spawnCursor: number;
  activeTargets: ArcadeTarget[];
  lockedTargetId: string | null;
  typedBuffer: string;
  lives: number;
  score: number;
  elapsedMs: number;
  wrongKeyCount: number;
  hitIds: string[];
  missedIds: string[];
  hintedIds: string[];
  lastSavedAt: string;
}
