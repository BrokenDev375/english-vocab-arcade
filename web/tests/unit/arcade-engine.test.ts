import { describe, it, expect } from "vitest";
import {
  createGame,
  startGame,
  step,
  consumeText,
  backspace,
  unlockTarget,
  selectTarget,
  pause,
  resume,
  serialize,
  restore,
  getRecallHint,
} from "@/features/arcade/engine";
import { filterEligibleCards } from "@/features/arcade/input";
import type { ArcadeCard } from "@/features/arcade/types";

function generateTestArcadeCards(count: number, prefix = "card"): ArcadeCard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}_${i + 1}`,
    term: `word${i + 1}`,
    meaningVi: `nghia ${i + 1}`,
  }));
}

describe("T10 Unit Tests - Arcade Pure Engine (U09 - U15)", () => {
  // ==========================================
  // U09: Arcade counts & stage remainder
  // ==========================================
  describe("U09 - Counts and stage remainder", () => {
    it("0 eligible cards produces empty queue without error", () => {
      const cards: ArcadeCard[] = [];
      const game = createGame(cards, { mode: "typing", seed: 42 });
      expect(game.orderedCardIds).toHaveLength(0);
      expect(game.phase).toBe("ready");
    });

    it("Filters ineligible cards (invalid characters or empty meaning)", () => {
      const mixed: ArcadeCard[] = [
        { id: "1", term: "valid", meaningVi: "hợp lệ" },
        { id: "2", term: "invalid漢字", meaningVi: "có chữ hán" }, // non-Latin
        { id: "3", term: "", meaningVi: "rỗng" },
        { id: "4", term: "good-term's", meaningVi: "hợp lệ" },
        { id: "5", term: "no meaning", meaningVi: "" },
      ];
      const { eligible, rejectedCount } = filterEligibleCards(mixed);
      expect(eligible).toHaveLength(2);
      expect(rejectedCount).toBe(3);
    });

    it("20 cards partitions into stages of 10 + 10 without missing or duplicate IDs", () => {
      const cards = generateTestArcadeCards(20);
      const game = createGame(cards, { mode: "typing", seed: 999 });

      expect(game.orderedCardIds).toHaveLength(20);
      const uniqueIds = new Set(game.orderedCardIds);
      expect(uniqueIds.size).toBe(20);
    });

    it("21 cards partitions into 10 + 10 + 1 with correct stages count", () => {
      const cards = generateTestArcadeCards(21);
      const game = createGame(cards, { mode: "recall", seed: 123 });
      expect(game.orderedCardIds).toHaveLength(21);

      const totalStages = Math.ceil(game.orderedCardIds.length / 10);
      expect(totalStages).toBe(3);
    });
  });

  // ==========================================
  // U10: Target locking with identical initials
  // ==========================================
  describe("U10 - Target locking with identical initial", () => {
    it("Selects target with smallest remaining flight time when multiple targets share initial", () => {
      const cards: ArcadeCard[] = [
        { id: "c1", term: "apple", meaningVi: "táo" },
        { id: "c2", term: "anchor", meaningVi: "neo" },
      ];

      let state = createGame(cards, { mode: "typing", seed: 100 });
      state = startGame(state);

      // Force 2 active targets with same initial 'a', but different progress
      state.activeTargets = [
        {
          id: "t_low_urgency",
          cardId: "c1",
          answerVariants: ["apple"],
          canonicalAnswer: "apple",
          meaning: "táo",
          progress: 0.1, // more remaining time
          flightTimeMs: 10000,
          spawnedAtMs: 100,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
        {
          id: "t_high_urgency",
          cardId: "c2",
          answerVariants: ["anchor"],
          canonicalAnswer: "anchor",
          meaning: "neo",
          progress: 0.8, // closer to falling -> higher urgency!
          flightTimeMs: 10000,
          spawnedAtMs: 200,
          lane: 1,
          hintUsed: false,
          resolved: false,
        },
      ];

      // Type 'a'
      const { state: nextState, events } = consumeText(state, "a");

      expect(nextState.lockedTargetId).toBe("t_high_urgency");
      expect(nextState.typedBuffer).toBe("a");
      expect(events.some((e) => e.type === "TARGET_LOCKED")).toBe(true);
    });

    it("Ties are broken stably by earlier spawnedAtMs", () => {
      const state = createGame([], { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t_second",
          cardId: "c2",
          answerVariants: ["bat"],
          canonicalAnswer: "bat",
          meaning: "gậy",
          progress: 0.2,
          flightTimeMs: 10000,
          spawnedAtMs: 500, // spawned later
          lane: 1,
          hintUsed: false,
          resolved: false,
        },
        {
          id: "t_first",
          cardId: "c1",
          answerVariants: ["ball"],
          canonicalAnswer: "ball",
          meaning: "bóng",
          progress: 0.2,
          flightTimeMs: 10000,
          spawnedAtMs: 200, // spawned earlier
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      const { state: nextState } = consumeText(state, "b");
      expect(nextState.lockedTargetId).toBe("t_first");
    });
  });

  // ==========================================
  // U11: Wrong key, Backspace, Escape, Switch
  // ==========================================
  describe("U11 - Input manipulation & wrong key penalty", () => {
    it("Wrong key increments wrongKeyCount without losing lives or changing flight time", () => {
      const state = createGame([], { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["cat"],
          canonicalAnswer: "cat",
          meaning: "mèo",
          progress: 0.5,
          flightTimeMs: 10000,
          spawnedAtMs: 100,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      // Type wrong key 'z' when no target starts with 'z'
      const { state: state1, events: events1 } = consumeText(state, "z");
      expect(state1.wrongKeyCount).toBe(1);
      expect(state1.lives).toBe(3);
      expect(state1.lockedTargetId).toBeNull();
      expect(events1.some((e) => e.type === "WRONG_KEY")).toBe(true);

      // Lock target by typing 'c'
      const { state: state2 } = consumeText(state1, "c");
      expect(state2.lockedTargetId).toBe("t1");
      expect(state2.typedBuffer).toBe("c");

      // Type wrong continuation 'x' instead of 'a'
      const { state: state3 } = consumeText(state2, "x");
      expect(state3.wrongKeyCount).toBe(2);
      expect(state3.typedBuffer).toBe("c"); // buffer not corrupted
      expect(state3.lockedTargetId).toBe("t1"); // lock not dropped
      expect(state3.lives).toBe(3); // lives unaffected
      expect(state3.activeTargets[0].progress).toBe(0.5); // progress unchanged
    });

    it("Backspace removes character and unlocks target when empty", () => {
      let state = createGame([], { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["dog"],
          canonicalAnswer: "dog",
          meaning: "chó",
          progress: 0.2,
          flightTimeMs: 10000,
          spawnedAtMs: 100,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      // Lock and type 'do'
      state = consumeText(state, "d").state;
      state = consumeText(state, "o").state;
      expect(state.typedBuffer).toBe("do");

      // Backspace once -> 'd'
      state = backspace(state);
      expect(state.typedBuffer).toBe("d");
      expect(state.lockedTargetId).toBe("t1");

      // Backspace again -> empty & unlocked
      state = backspace(state);
      expect(state.typedBuffer).toBe("");
      expect(state.lockedTargetId).toBeNull();
    });

    it("unlockTarget clears buffer and unlocks without altering target flight", () => {
      let state = createGame([], { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["fly"],
          canonicalAnswer: "fly",
          meaning: "bay",
          progress: 0.3,
          flightTimeMs: 10000,
          spawnedAtMs: 100,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      state = consumeText(state, "f").state;
      expect(state.lockedTargetId).toBe("t1");

      state = unlockTarget(state);
      expect(state.lockedTargetId).toBeNull();
      expect(state.typedBuffer).toBe("");
      expect(state.activeTargets[0].progress).toBe(0.3);
    });

    it("selectTarget switches target and resets buffer without resetting flight time", () => {
      let state = createGame([], { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["run"],
          canonicalAnswer: "run",
          meaning: "chạy",
          progress: 0.4,
          flightTimeMs: 10000,
          spawnedAtMs: 100,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
        {
          id: "t2",
          cardId: "c2",
          answerVariants: ["walk"],
          canonicalAnswer: "walk",
          meaning: "đi",
          progress: 0.6,
          flightTimeMs: 10000,
          spawnedAtMs: 200,
          lane: 1,
          hintUsed: false,
          resolved: false,
        },
      ];

      state = consumeText(state, "r").state;
      expect(state.lockedTargetId).toBe("t1");

      state = selectTarget(state, "t2");
      expect(state.lockedTargetId).toBe("t2");
      expect(state.typedBuffer).toBe("");
      expect(state.activeTargets[0].progress).toBe(0.4);
      expect(state.activeTargets[1].progress).toBe(0.6);
    });
  });

  // ==========================================
  // U12: Hit vs collision priority
  // ==========================================
  describe("U12 - Hit frame collision single outcome", () => {
    it("Resolving hit removes target and adds score without incurring double miss penalty", () => {
      const cards = [{ id: "c1", term: "sun", meaningVi: "mặt trời" }];
      const lookup = new Map(cards.map((c) => [c.id, c]));

      const state = createGame(cards, { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["sun"],
          canonicalAnswer: "sun",
          meaning: "mặt trời",
          progress: 0.99, // on the verge of collision
          flightTimeMs: 10000,
          spawnedAtMs: 0,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      // Solve target right now
      const { state: hitState, events } = consumeText(state, "sun");

      expect(hitState.score).toBeGreaterThan(0);
      expect(hitState.hitIds).toContain("c1");
      expect(hitState.activeTargets).toHaveLength(0);
      expect(hitState.lives).toBe(3); // lives intact!
      expect(events.some((e) => e.type === "TARGET_HIT")).toBe(true);

      // Now step forward in time
      const { state: afterStep, events: stepEvents } = step(hitState, 200, lookup);
      // It should NOT emit TARGET_MISSED for c1!
      expect(afterStep.lives).toBe(3);
      expect(afterStep.missedIds).not.toContain("c1");
      expect(stepEvents.some((e) => e.type === "TARGET_MISSED")).toBe(false);
    });
  });

  // ==========================================
  // U13: Zero lives takes precedence over won
  // ==========================================
  describe("U13 - Zero lives priority over victory", () => {
    it("When last miss causes lives=0 at the end of the queue, game is lost and input is ignored", () => {
      const cards = [{ id: "c1", term: "moon", meaningVi: "mặt trăng" }];
      const lookup = new Map(cards.map((c) => [c.id, c]));

      const state = createGame(cards, { mode: "typing", seed: 1 });
      state.phase = "running";
      state.lives = 1; // only 1 life left
      state.spawnCursor = 1; // last card already spawned
      state.activeTargets = [
        {
          id: "t_last",
          cardId: "c1",
          answerVariants: ["moon"],
          canonicalAnswer: "moon",
          meaning: "mặt trăng",
          progress: 0.98,
          flightTimeMs: 1000,
          spawnedAtMs: 0,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      // Advance past deadline -> target misses
      const { state: stepState, events } = step(state, 50, lookup);

      expect(stepState.lives).toBe(0);
      expect(stepState.phase).toBe("lost");
      expect(events.some((e) => e.type === "GAME_LOST")).toBe(true);
      expect(events.some((e) => e.type === "GAME_WON")).toBe(false);

      // Terminal state ignores input
      const { state: inputAfterLoss } = consumeText(stepState, "moon");
      expect(inputAfterLoss.score).toBe(0);
      expect(inputAfterLoss.phase).toBe("lost");
    });
  });

  // ==========================================
  // U14: Pause, hidden, resume, restore
  // ==========================================
  describe("U14 - Pause, resume, and restore", () => {
    it("Pause and resume do not advance elapsed time or progress", () => {
      const cards = [{ id: "c1", term: "tree", meaningVi: "cây" }];
      const lookup = new Map(cards.map((c) => [c.id, c]));

      let state = createGame(cards, { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["tree"],
          canonicalAnswer: "tree",
          meaning: "cây",
          progress: 0.5,
          flightTimeMs: 10000,
          spawnedAtMs: 0,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      // Pause
      state = pause(state);
      expect(state.phase).toBe("paused");

      // Stepping during pause has no effect
      const { state: pausedStep } = step(state, 1000, lookup);
      expect(pausedStep.elapsedMs).toBe(0);
      expect(pausedStep.activeTargets[0].progress).toBe(0.5);

      // Resume
      state = resume(pausedStep);
      expect(state.phase).toBe("running");

      // Advance
      const { state: runningStep } = step(state, 100, lookup);
      expect(runningStep.elapsedMs).toBe(100);
      expect(runningStep.activeTargets[0].progress).toBeGreaterThan(0.5);
    });

    it("Excessive frame gap (>250ms) triggers automatic pause safeguard", () => {
      const cards = [{ id: "c1", term: "water", meaningVi: "nước" }];
      const lookup = new Map(cards.map((c) => [c.id, c]));

      const state = createGame(cards, { mode: "typing", seed: 1 });
      state.phase = "running";

      const { state: nextState, events } = step(state, 500, lookup);
      expect(nextState.phase).toBe("paused");
      expect(events.some((e) => e.type === "GAME_PAUSED")).toBe(true);
    });

    it("Restore always returns game in paused state without advancing flight", () => {
      const cards = [{ id: "c1", term: "star", meaningVi: "ngôi sao" }];
      const state = createGame(cards, { mode: "typing", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["star"],
          canonicalAnswer: "star",
          meaning: "ngôi sao",
          progress: 0.35,
          flightTimeMs: 10000,
          spawnedAtMs: 50,
          lane: 1,
          hintUsed: false,
          resolved: false,
        },
      ];

      const saved = serialize(state);
      const restored = restore(saved, cards);

      expect(restored.phase).toBe("paused");
      expect(restored.activeTargets[0].progress).toBe(0.35);
      expect(restored.lives).toBe(3);
    });
  });

  // ==========================================
  // U15: Hints & typing practice restrictions
  // ==========================================
  describe("U15 - Hints & scoring rules", () => {
    it("getRecallHint returns first letter at 65% and first+last at 85%", () => {
      const term = "courage";
      expect(getRecallHint(term, 0.5)).toBeUndefined();
      expect(getRecallHint(term, 0.65)).toBe("c...");
      expect(getRecallHint(term, 0.85)).toBe("c...e");
    });

    it("Hit with hint grants only base score (100) and 0 speed bonus", () => {
      const cards = [{ id: "c1", term: "courage", meaningVi: "dũng cảm" }];
      const state = createGame(cards, { mode: "recall", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["courage"],
          canonicalAnswer: "courage",
          meaning: "dũng cảm",
          progress: 0.7, // already got hint
          flightTimeMs: 10000,
          spawnedAtMs: 0,
          lane: 0,
          hintUsed: true, // marked hinted
          resolved: false,
        },
      ];

      const { state: hitState, events } = consumeText(state, "courage");
      expect(hitState.score).toBe(100); // 100 base, 0 speed bonus!
      const hitEvent = events.find((e) => e.type === "TARGET_HIT");
      expect(hitEvent?.payload?.speedBonus).toBe(0);
      expect(hitEvent?.payload?.hintUsed).toBe(true);
    });

    it("Hit without hint at high remaining flight grants base score + speed bonus", () => {
      const cards = [{ id: "c1", term: "fast", meaningVi: "nhanh" }];
      const state = createGame(cards, { mode: "recall", seed: 1 });
      state.phase = "running";
      state.activeTargets = [
        {
          id: "t1",
          cardId: "c1",
          answerVariants: ["fast"],
          canonicalAnswer: "fast",
          meaning: "nhanh",
          progress: 0.1, // 90% remaining flight
          flightTimeMs: 10000,
          spawnedAtMs: 0,
          lane: 0,
          hintUsed: false,
          resolved: false,
        },
      ];

      const { state: hitState, events } = consumeText(state, "fast");
      // 100 base + floor(40 * 0.9) = 100 + 36 = 136
      expect(hitState.score).toBe(136);
      const hitEvent = events.find((e) => e.type === "TARGET_HIT");
      expect(hitEvent?.payload?.speedBonus).toBe(36);
      expect(hitEvent?.payload?.hintUsed).toBe(false);
    });
  });
});
