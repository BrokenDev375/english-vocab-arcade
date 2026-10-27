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
});
