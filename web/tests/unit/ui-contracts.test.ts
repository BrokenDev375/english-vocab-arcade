import { describe, it, expect } from "vitest";
import { DEMO_CARDS, DEMO_SETS } from "@/data/demo/vocabulary.demo";
import { VocabularyCardSchema, LearningSetSchema } from "@/contracts/vocabulary";

describe("T01 UI and Demo Data Contracts", () => {
  it("contains exactly 20 demo cards for DEMO_MODE", () => {
    expect(DEMO_CARDS.length).toBe(20);
  });

  it("validates every demo card against VocabularyCardSchema", () => {
    for (const card of DEMO_CARDS) {
      const parsed = VocabularyCardSchema.safeParse(card);
      expect(parsed.success).toBe(true);
    }
  });

  it("validates every demo set against LearningSetSchema", () => {
    for (const set of DEMO_SETS) {
      const parsed = LearningSetSchema.safeParse(set);
      expect(parsed.success).toBe(true);
    }
  });

  it("does not contain any Chinese/HSK/pinyin fields in any card", () => {
    for (const card of DEMO_CARDS) {
      const keys = Object.keys(card);
      expect(keys).not.toContain("pinyin");
      expect(keys).not.toContain("chineseSentence");
      expect(keys).not.toContain("hskLevel");
      expect(keys).not.toContain("hanzi");
    }
  });

  it("does not expose author profile or avatar in learning sets", () => {
    for (const set of DEMO_SETS) {
      const keys = Object.keys(set);
      expect(keys).not.toContain("authorName");
      expect(keys).not.toContain("authorAvatar");
      expect(keys).not.toContain("username");
      expect(keys).not.toContain("creatorProfile");
    }
  });

  it("verifies card positions are continuous starting from 0", () => {
    DEMO_CARDS.forEach((card, index) => {
      expect(card.position).toBe(index);
    });
  });

  it("R04: Verifies user-scoped localStorage isolation and complete logout cleanup", async () => {
    const {
      recordLocalAttempt,
      getLocalSessionAttempts,
      clearUserLocalData,
      buildLocalProgressKey,
    } = await import("@/features/study/study-client-adapter");

    // Setup an in-memory localStorage mock
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      key: (i: number) => Object.keys(store)[i] || null,
      get length() {
        return Object.keys(store).length;
      },
    };

    // Temporarily attach mockStorage to global window
    const originalWindow = globalThis.window;
    (globalThis as unknown as { window: unknown }).window = { localStorage: mockStorage };
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;

    try {
      // 1. User A records attempt and progress
      recordLocalAttempt(
        {
          clientEventId: "evt_1",
          sessionId: "sess_a",
          setId: "set_1",
          cardId: "card_1",
          mode: "learn",
          questionType: "multiple_choice",
          userAnswer: "apple",
          isCorrect: true,
          durationMs: 1200,
          answeredAt: new Date().toISOString(),
        },
        "user_a"
      );

      // Verify User A has attempts
      const attemptsA = getLocalSessionAttempts("sess_a", "user_a");
      expect(attemptsA).toHaveLength(1);

      // Verify User B on same browser does NOT see User A's attempts or progress
      const attemptsB = getLocalSessionAttempts("sess_a", "user_b");
      expect(attemptsB).toHaveLength(0);

      const progressA = mockStorage.getItem(buildLocalProgressKey("user_a", "set_1"));
      const progressB = mockStorage.getItem(buildLocalProgressKey("user_b", "set_1"));
      expect(progressA).not.toBeNull();
      expect(progressB).toBeNull();

      // 2. User A logs out and cleans up
      clearUserLocalData("user_a");

      // Verify all User A keys are removed
      const attemptsAfterClear = getLocalSessionAttempts("sess_a", "user_a");
      expect(attemptsAfterClear).toHaveLength(0);
      expect(mockStorage.getItem(buildLocalProgressKey("user_a", "set_1"))).toBeNull();
    } finally {
      // Restore original window
      (globalThis as unknown as { window: unknown }).window = originalWindow;
      (globalThis as unknown as { localStorage: unknown }).localStorage = originalWindow?.localStorage;
    }
  });
});
