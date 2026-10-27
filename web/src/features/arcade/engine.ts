import { ARCADE_CONSTANTS } from "./constants";
import {
  type ArcadeCard,
  type ArcadeGameState,
  type ArcadeTarget,
  type ArcadeEvent,
  type ArcadeEventType,
  type SavedArcadeState,
  type ArcadeMode,
  type ArcadePhase,
} from "./types";
import {
  normalizeArcadeText,
  filterEligibleCards,
  matchesAnswerPrefix,
  matchesExactAnswer,
} from "./input";
import { shuffle, createSeededRng, type RngFunction } from "../study/shuffle";

export interface CreateGameOptions {
  mode: ArcadeMode;
  seed?: number | string;
}

let eventCounter = 0;
function createEventId(type: ArcadeEventType): string {
  eventCounter++;
  return `evt_${type.toLowerCase()}_${eventCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Derives a numeric seed from a number or string.
 */
function toNumericSeed(seedInput?: number | string): number {
  if (typeof seedInput === "number") return seedInput;
  if (!seedInput) return 12345;
  let hash = 0;
  for (let i = 0; i < seedInput.length; i++) {
    hash = (hash << 5) - hash + seedInput.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

/**
 * Calculates hints for recall mode based on flight progress.
 */
export function getRecallHint(canonicalAnswer: string, progress: number): string | undefined {
  if (!canonicalAnswer || canonicalAnswer.length < 2) return undefined;

  if (progress >= ARCADE_CONSTANTS.HINT_2_PROGRESS) {
    if (canonicalAnswer.length <= 3) {
      return `${canonicalAnswer[0]}...`;
    }
    return `${canonicalAnswer[0]}...${canonicalAnswer[canonicalAnswer.length - 1]}`;
  }

  if (progress >= ARCADE_CONSTANTS.HINT_1_PROGRESS) {
    return `${canonicalAnswer[0]}...`;
  }

  return undefined;
}

/**
 * Initializes a new Arcade Game State according to docs/05.
 */
export function createGame(
  cards: readonly ArcadeCard[],
  options: CreateGameOptions,
  customRng?: RngFunction
): ArcadeGameState {
  const { eligible } = filterEligibleCards(cards);
  const numericSeed = toNumericSeed(options.seed);
  const rng = customRng || createSeededRng(numericSeed);

  // Fisher-Yates single shuffle across the entire pool
  const shuffledCards = shuffle(eligible, rng);
  const orderedCardIds = shuffledCards.map((c) => c.id);

  return {
    phase: "ready",
    mode: options.mode,
    seed: String(options.seed ?? numericSeed),
    orderedCardIds,
    stageIndex: 0,
    spawnCursor: 0,
    activeTargets: [],
    lockedTargetId: null,
    typedBuffer: "",
    lives: ARCADE_CONSTANTS.DEFAULT_LIVES,
    score: 0,
    elapsedMs: 0,
    wrongKeyCount: 0,
    hitIds: [],
    missedIds: [],
    hintedIds: [],
    timeSinceLastSpawnMs: 0,
  };
}

/**
 * Starts the game from ready phase.
 */
export function startGame(state: ArcadeGameState): ArcadeGameState {
  if (state.phase !== "ready") return state;
  return {
    ...state,
    phase: "running",
    timeSinceLastSpawnMs: ARCADE_CONSTANTS.getSpawnIntervalMs(state.stageIndex), // Trigger initial spawn immediately
  };
}

/**
 * Advances the game simulation by deltaMs.
 */
export function step(
  state: ArcadeGameState,
  deltaMs: number,
  cardLookup: ReadonlyMap<string, ArcadeCard>
): { state: ArcadeGameState; events: ArcadeEvent[] } {
  // Terminal phases or non-running ignore steps
  if (state.phase !== "running") {
    return { state, events: [] };
  }

  const events: ArcadeEvent[] = [];

  // Frame gap safeguard: pause if gap exceeds 250ms (docs/05 Section 9)
  if (deltaMs > ARCADE_CONSTANTS.MAX_FRAME_GAP_MS) {
    const pauseEvent: ArcadeEvent = {
      id: createEventId("GAME_PAUSED"),
      type: "GAME_PAUSED",
      timestampMs: state.elapsedMs,
      payload: { reason: "frame_gap_exceeded" },
    };
    return {
      state: { ...state, phase: "paused" },
      events: [pauseEvent],
    };
  }

  const nextElapsed = state.elapsedMs + deltaMs;
  let nextTimeSinceLastSpawn = state.timeSinceLastSpawnMs + deltaMs;
  let nextLives = state.lives;
  let nextLockedId = state.lockedTargetId;
  let nextBuffer = state.typedBuffer;

  const nextHitIds = [...state.hitIds];
  const nextMissedIds = [...state.missedIds];
  const nextHintedIds = [...state.hintedIds];

  const stageStartIndex = state.stageIndex * ARCADE_CONSTANTS.CARDS_PER_STAGE;
  const stageEndIndex = Math.min(
    state.orderedCardIds.length,
    stageStartIndex + ARCADE_CONSTANTS.CARDS_PER_STAGE
  );

  // 1. Advance active targets and check misses
  const survivingTargets: ArcadeTarget[] = [];

  for (const target of state.activeTargets) {
    if (target.resolved) continue;

    const progressDelta = deltaMs / target.flightTimeMs;
    const nextProgress = target.progress + progressDelta;

    if (nextProgress >= 1.0) {
      // Missed target!
      nextLives = Math.max(0, nextLives - 1);
      nextMissedIds.push(target.cardId);

      events.push({
        id: createEventId("TARGET_MISSED"),
        type: "TARGET_MISSED",
        timestampMs: nextElapsed,
        payload: {
          targetId: target.id,
          cardId: target.cardId,
          canonicalAnswer: target.canonicalAnswer,
          remainingLives: nextLives,
        },
      });

      // Release lock and buffer if the missed target was locked
      if (nextLockedId === target.id) {
        nextLockedId = null;
        nextBuffer = "";
        events.push({
          id: createEventId("TARGET_UNLOCKED"),
          type: "TARGET_UNLOCKED",
          timestampMs: nextElapsed,
          payload: { targetId: target.id },
        });
      }
    } else {
      // Surviving target: update progress and hints
      let hintUsed = target.hintUsed;
      let hintText = target.hintText;

      if (state.mode === "recall") {
        const hint = getRecallHint(target.canonicalAnswer, nextProgress);
        if (hint && !hintUsed) {
          hintUsed = true;
          hintText = hint;
          if (!nextHintedIds.includes(target.cardId)) {
            nextHintedIds.push(target.cardId);
          }
        }
      }

      survivingTargets.push({
        ...target,
        progress: nextProgress,
        hintUsed,
        hintText,
      });
    }
  }

  // 2. Check terminal priority: Lost has precedence over won
  if (nextLives === 0) {
    events.push({
      id: createEventId("GAME_LOST"),
      type: "GAME_LOST",
      timestampMs: nextElapsed,
      payload: { remainingLives: 0 },
    });

    return {
      state: {
        ...state,
        phase: "lost",
        lives: 0,
        elapsedMs: nextElapsed,
        activeTargets: [],
        lockedTargetId: null,
        typedBuffer: "",
        missedIds: nextMissedIds,
        hitIds: nextHitIds,
        hintedIds: nextHintedIds,
      },
      events,
    };
  }

  // 3. Spawning new targets
  let nextSpawnCursor = state.spawnCursor;
  const maxActive = ARCADE_CONSTANTS.getMaxActiveTargets(state.stageIndex);
  const spawnInterval = ARCADE_CONSTANTS.getSpawnIntervalMs(state.stageIndex);

  if (
    nextSpawnCursor < stageEndIndex &&
    survivingTargets.length < maxActive &&
    nextTimeSinceLastSpawn >= spawnInterval
  ) {
    const candidateCardId = state.orderedCardIds[nextSpawnCursor];
    const candidateCard = cardLookup.get(candidateCardId);

    if (candidateCard) {
      // Determine answer variants
      const normCanonical = normalizeArcadeText(candidateCard.term);
      const answerVariants =
        state.mode === "typing"
          ? [normCanonical]
          : [
              normCanonical,
              ...(candidateCard.acceptedAnswers || []).map(normalizeArcadeText),
            ];

      // Conflict scheduling: check if any active target shares an answer variant
      const hasConflict = survivingTargets.some((active) =>
        active.answerVariants.some((v) => answerVariants.includes(v))
      );

      if (!hasConflict) {
        // Find least crowded lane (0, 1, 2)
        const laneCounts = [0, 0, 0];
        for (const t of survivingTargets) {
          laneCounts[t.lane]++;
        }
        let chosenLane = 0;
        let minCount = laneCounts[0];
        for (let l = 1; l < ARCADE_CONSTANTS.MAX_LANES; l++) {
          if (laneCounts[l] < minCount) {
            minCount = laneCounts[l];
            chosenLane = l;
          }
        }

        const flightTimeMs = ARCADE_CONSTANTS.getFlightTimeMs(
          normCanonical.length,
          state.stageIndex
        );

        const newTarget: ArcadeTarget = {
          id: `target_${candidateCardId}_${nextElapsed}`,
          cardId: candidateCardId,
          answerVariants,
          canonicalAnswer: candidateCard.term,
          meaning: candidateCard.meaningVi,
          progress: 0,
          flightTimeMs,
          spawnedAtMs: nextElapsed,
          lane: chosenLane,
          hintUsed: false,
          resolved: false,
        };

        survivingTargets.push(newTarget);
        nextSpawnCursor++;
        nextTimeSinceLastSpawn = 0;

        events.push({
          id: createEventId("TARGET_SPAWNED"),
          type: "TARGET_SPAWNED",
          timestampMs: nextElapsed,
          payload: { targetId: newTarget.id, cardId: candidateCardId },
        });
      }
    }
  }

  // 4. Check stage completion or won
  let nextPhase: ArcadePhase = state.phase;
  const stageSpawnFinished = nextSpawnCursor >= stageEndIndex;
  const stageTargetsCleared = survivingTargets.length === 0;

  if (stageSpawnFinished && stageTargetsCleared) {
    const totalStages = Math.ceil(
      state.orderedCardIds.length / ARCADE_CONSTANTS.CARDS_PER_STAGE
    );

    if (state.stageIndex + 1 < totalStages) {
      nextPhase = "stage_complete";
      events.push({
        id: createEventId("STAGE_COMPLETED"),
        type: "STAGE_COMPLETED",
        timestampMs: nextElapsed,
        payload: {
          stageIndex: state.stageIndex,
          totalStages,
        },
      });
    } else {
      nextPhase = "won";
      events.push({
        id: createEventId("GAME_WON"),
        type: "GAME_WON",
        timestampMs: nextElapsed,
        payload: {
          totalStages,
          totalScore: state.score,
        },
      });
    }
  }

  return {
    state: {
      ...state,
      phase: nextPhase,
      lives: nextLives,
      elapsedMs: nextElapsed,
      timeSinceLastSpawnMs: nextTimeSinceLastSpawn,
      spawnCursor: nextSpawnCursor,
      activeTargets: survivingTargets,
      lockedTargetId: nextLockedId,
      typedBuffer: nextBuffer,
      hitIds: nextHitIds,
      missedIds: nextMissedIds,
      hintedIds: nextHintedIds,
    },
    events,
  };
}

/**
 * Handles text input from the player.
 */
export function consumeText(
  state: ArcadeGameState,
  inputText: string
): { state: ArcadeGameState; events: ArcadeEvent[] } {
  if (state.phase !== "running" || state.lives <= 0 || !inputText) {
    return { state, events: [] };
  }

  const events: ArcadeEvent[] = [];
  let nextLockedId = state.lockedTargetId;
  let nextBuffer = state.typedBuffer;
  let nextScore = state.score;
  let nextWrongKeys = state.wrongKeyCount;
  const nextHitIds = [...state.hitIds];
  let updatedActiveTargets = [...state.activeTargets];

  // Process char-by-char to handle prefixes & multi-char accurately
  for (const char of inputText) {
    // 1. If no target locked yet: attempt to lock a target by first character
    if (nextLockedId === null) {
      const matchingTargets = updatedActiveTargets.filter((t) =>
        t.answerVariants.some((v) => v.startsWith(char.toLowerCase()))
      );

      if (matchingTargets.length === 0) {
        nextWrongKeys++;
        events.push({
          id: createEventId("WRONG_KEY"),
          type: "WRONG_KEY",
          timestampMs: state.elapsedMs,
          payload: { char },
        });
        continue;
      }

      // Tie-break according to docs/05 Section 5:
      // Smallest remaining flight time, then earlier spawnedAtMs, then id
      matchingTargets.sort((a, b) => {
        const remA = a.flightTimeMs * (1 - a.progress);
        const remB = b.flightTimeMs * (1 - b.progress);
        if (Math.abs(remA - remB) > 0.001) return remA - remB;
        if (a.spawnedAtMs !== b.spawnedAtMs) return a.spawnedAtMs - b.spawnedAtMs;
        return a.id.localeCompare(b.id);
      });

      const selected = matchingTargets[0];
      nextLockedId = selected.id;
      nextBuffer = char.toLowerCase();

      events.push({
        id: createEventId("TARGET_LOCKED"),
        type: "TARGET_LOCKED",
        timestampMs: state.elapsedMs,
        payload: { targetId: selected.id, cardId: selected.cardId },
      });

      // Check immediate 1-char match
      if (matchesExactAnswer(nextBuffer, selected.answerVariants)) {
        const hitResult = resolveHit(selected, state.elapsedMs, nextScore);
        nextScore = hitResult.newScore;
        nextHitIds.push(selected.cardId);
        updatedActiveTargets = updatedActiveTargets.filter((t) => t.id !== selected.id);
        nextLockedId = null;
        nextBuffer = "";
        events.push(hitResult.event);
      }
    } else {
      // 2. Target is already locked
      const lockedTarget = updatedActiveTargets.find((t) => t.id === nextLockedId);
      if (!lockedTarget) {
        nextLockedId = null;
        nextBuffer = "";
        continue;
      }

      const candidateBuffer = nextBuffer + char.toLowerCase();

      if (matchesAnswerPrefix(candidateBuffer, lockedTarget.answerVariants)) {
        nextBuffer = candidateBuffer;

        if (matchesExactAnswer(nextBuffer, lockedTarget.answerVariants)) {
          const hitResult = resolveHit(lockedTarget, state.elapsedMs, nextScore);
          nextScore = hitResult.newScore;
          nextHitIds.push(lockedTarget.cardId);
          updatedActiveTargets = updatedActiveTargets.filter((t) => t.id !== lockedTarget.id);
          nextLockedId = null;
          nextBuffer = "";
          events.push(hitResult.event);
        }
      } else {
        // Wrong key: keep buffer, increase count, no lives lost, no time reset
        nextWrongKeys++;
        events.push({
          id: createEventId("WRONG_KEY"),
          type: "WRONG_KEY",
          timestampMs: state.elapsedMs,
          payload: { char, lockedTargetId: nextLockedId },
        });
      }
    }
  }

  // Check stage completion or won after hits
  let nextPhase: ArcadePhase = state.phase;
  const stageStartIndex = state.stageIndex * ARCADE_CONSTANTS.CARDS_PER_STAGE;
  const stageEndIndex = Math.min(
    state.orderedCardIds.length,
    stageStartIndex + ARCADE_CONSTANTS.CARDS_PER_STAGE
  );
  const stageSpawnFinished = state.spawnCursor >= stageEndIndex;
  const stageTargetsCleared = updatedActiveTargets.length === 0;

  if (stageSpawnFinished && stageTargetsCleared) {
    const totalStages = Math.ceil(
      state.orderedCardIds.length / ARCADE_CONSTANTS.CARDS_PER_STAGE
    );

    if (state.stageIndex + 1 < totalStages) {
      nextPhase = "stage_complete";
      events.push({
        id: createEventId("STAGE_COMPLETED"),
        type: "STAGE_COMPLETED",
        timestampMs: state.elapsedMs,
        payload: { stageIndex: state.stageIndex, totalStages },
      });
    } else {
      nextPhase = "won";
      events.push({
        id: createEventId("GAME_WON"),
        type: "GAME_WON",
        timestampMs: state.elapsedMs,
        payload: { totalStages, totalScore: nextScore },
      });
    }
  }

  return {
    state: {
      ...state,
      phase: nextPhase,
      score: nextScore,
      wrongKeyCount: nextWrongKeys,
      activeTargets: updatedActiveTargets,
      lockedTargetId: nextLockedId,
      typedBuffer: nextBuffer,
      hitIds: nextHitIds,
    },
    events,
  };
}

/**
 * Calculates score and returns the hit event.
 */
function resolveHit(
  target: ArcadeTarget,
  timestampMs: number,
  currentScore: number
): { newScore: number; event: ArcadeEvent } {
  const baseScore = ARCADE_CONSTANTS.BASE_HIT_SCORE;
  const speedBonus = target.hintUsed
    ? 0
    : ARCADE_CONSTANTS.getSpeedBonus(1 - target.progress);
  const scoreAdded = baseScore + speedBonus;

  return {
    newScore: currentScore + scoreAdded,
    event: {
      id: createEventId("TARGET_HIT"),
      type: "TARGET_HIT",
      timestampMs,
      payload: {
        targetId: target.id,
        cardId: target.cardId,
        canonicalAnswer: target.canonicalAnswer,
        scoreAdded,
        speedBonus,
        hintUsed: target.hintUsed,
      },
    },
  };
}

/**
 * Handles Backspace input: deletes last character, or unlocks if empty.
 */
export function backspace(state: ArcadeGameState): ArcadeGameState {
  if (state.lockedTargetId === null) return state;

  if (state.typedBuffer.length <= 1) {
    return {
      ...state,
      lockedTargetId: null,
      typedBuffer: "",
    };
  }

  return {
    ...state,
    typedBuffer: state.typedBuffer.slice(0, -1),
  };
}

/**
 * Unlocks the currently selected target without modifying its flight time.
 */
export function unlockTarget(state: ArcadeGameState): ArcadeGameState {
  return {
    ...state,
    lockedTargetId: null,
    typedBuffer: "",
  };
}

/**
 * Manually selects/locks a specific target (e.g. by click/tap).
 */
export function selectTarget(state: ArcadeGameState, targetId: string): ArcadeGameState {
  if (state.lockedTargetId === targetId) return state;
  const target = state.activeTargets.find((t) => t.id === targetId);
  if (!target) return state;

  return {
    ...state,
    lockedTargetId: targetId,
    typedBuffer: "",
  };
}

/**
 * Pauses the game.
 */
export function pause(state: ArcadeGameState): ArcadeGameState {
  if (state.phase !== "running") return state;
  return {
    ...state,
    phase: "paused",
  };
}

/**
 * Resumes the game from paused state.
 */
export function resume(state: ArcadeGameState): ArcadeGameState {
  if (state.phase !== "paused") return state;
  return {
    ...state,
    phase: "running",
  };
}

/**
 * Advances to the next stage when stage_complete.
 */
export function nextStage(state: ArcadeGameState): ArcadeGameState {
  if (state.phase !== "stage_complete") return state;
  return {
    ...state,
    stageIndex: state.stageIndex + 1,
    phase: "running",
    timeSinceLastSpawnMs: ARCADE_CONSTANTS.getSpawnIntervalMs(state.stageIndex + 1),
    lockedTargetId: null,
    typedBuffer: "",
  };
}

/**
 * Serializes the game state for persistent storage.
 */
export function serialize(state: ArcadeGameState): SavedArcadeState {
  return {
    version: 1,
    phase: state.phase,
    mode: state.mode,
    seed: state.seed,
    orderedCardIds: [...state.orderedCardIds],
    stageIndex: state.stageIndex,
    spawnCursor: state.spawnCursor,
    activeTargets: state.activeTargets.map((t) => ({ ...t })),
    lockedTargetId: state.lockedTargetId,
    typedBuffer: state.typedBuffer,
    lives: state.lives,
    score: state.score,
    elapsedMs: state.elapsedMs,
    wrongKeyCount: state.wrongKeyCount,
    hitIds: [...state.hitIds],
    missedIds: [...state.missedIds],
    hintedIds: [...state.hintedIds],
    lastSavedAt: new Date().toISOString(),
  };
}

/**
 * Restores a saved state, always entering paused phase.
 */
export function restore(
  saved: SavedArcadeState,
  cards: readonly ArcadeCard[]
): ArcadeGameState {
  const { eligible } = filterEligibleCards(cards);
  const eligibleIdSet = new Set(eligible.map((c) => c.id));

  // Filter orderedCardIds to ensure only valid IDs are restored
  const validOrderedIds = saved.orderedCardIds.filter((id) => eligibleIdSet.has(id));

  return {
    phase: saved.phase === "lost" || saved.phase === "won" ? saved.phase : "paused",
    mode: saved.mode,
    seed: saved.seed,
    orderedCardIds: validOrderedIds,
    stageIndex: saved.stageIndex,
    spawnCursor: saved.spawnCursor,
    activeTargets: saved.activeTargets.map((t) => ({ ...t })),
    lockedTargetId: saved.lockedTargetId,
    typedBuffer: saved.typedBuffer,
    lives: saved.lives,
    score: saved.score,
    elapsedMs: saved.elapsedMs,
    wrongKeyCount: saved.wrongKeyCount,
    hitIds: [...saved.hitIds],
    missedIds: [...saved.missedIds],
    hintedIds: [...saved.hintedIds],
    timeSinceLastSpawnMs: 0,
  };
}
