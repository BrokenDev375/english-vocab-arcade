import { describe, it, expect } from "vitest";
import {
  createMatchPlan,
  checkMatch,
  resolveStageConflicts,
  type MatchCard,
  type MatchTile,
} from "@/features/match/engine";
import { createSeededRng } from "@/features/study/shuffle";

function generateTestCards(count: number): MatchCard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `card_${i + 1}`,
    term: `term_${i + 1}`,
    meaningVi: `nghia_${i + 1}`,
  }));
}

describe("T09 Unit Tests - Match Engine (U02, U03)", () => {
  it("U02: Match 20 cards partitions into 6 + 6 + 6 + 2 without duplicate or missing IDs", () => {
    const cards = generateTestCards(20);
    const rng = createSeededRng(12345);
    const plan = createMatchPlan(cards, rng);

    expect(plan.totalPairs).toBe(20);
    expect(plan.stages).toHaveLength(4);

    // Check counts of each stage
    expect(plan.stages[0].cards).toHaveLength(6);
    expect(plan.stages[0].tiles).toHaveLength(12);

    expect(plan.stages[1].cards).toHaveLength(6);
    expect(plan.stages[1].tiles).toHaveLength(12);

    expect(plan.stages[2].cards).toHaveLength(6);
    expect(plan.stages[2].tiles).toHaveLength(12);

    expect(plan.stages[3].cards).toHaveLength(2);
    expect(plan.stages[3].tiles).toHaveLength(4);

    // Verify all 20 card IDs appear exactly once across stages
    const seenCardIds = new Set<string>();
    for (const stage of plan.stages) {
      for (const card of stage.cards) {
        expect(seenCardIds.has(card.id)).toBe(false);
        seenCardIds.add(card.id);
      }
    }
    expect(seenCardIds.size).toBe(20);

    // Verify each stage has equal terms and meanings, properly tagged
    for (const stage of plan.stages) {
      const terms = stage.tiles.filter((t) => t.type === "term");
      const meanings = stage.tiles.filter((t) => t.type === "meaning");
      expect(terms).toHaveLength(stage.cards.length);
      expect(meanings).toHaveLength(stage.cards.length);
    }
  });

  it("Handles boundary cases: 0 cards and 1 card correctly", () => {
    // 0 cards
    const emptyPlan = createMatchPlan([]);
    expect(emptyPlan.totalPairs).toBe(0);
    expect(emptyPlan.stages).toHaveLength(0);

    // 1 card
    const singleCard = [{ id: "single", term: "solo", meaningVi: "đơn độc" }];
    const singlePlan = createMatchPlan(singleCard);
    expect(singlePlan.totalPairs).toBe(1);
    expect(singlePlan.stages).toHaveLength(1);
    expect(singlePlan.stages[0].cards).toHaveLength(1);
    expect(singlePlan.stages[0].tiles).toHaveLength(2);
  });

  it("U03: Separates cards with duplicate text across stages to prevent ambiguity", () => {
    // Stage 1 has a duplicate term with another card
    const cards: MatchCard[] = [
      { id: "c1", term: "run", meaningVi: "chạy" },
      { id: "c2", term: "run", meaningVi: "vận hành" }, // duplicate term!
      { id: "c3", term: "walk", meaningVi: "đi bộ" },
      { id: "c4", term: "jump", meaningVi: "nhảy" },
      { id: "c5", term: "swim", meaningVi: "bơi" },
      { id: "c6", term: "fly", meaningVi: "bay" },
      { id: "c7", term: "read", meaningVi: "đọc" },
      { id: "c8", term: "write", meaningVi: "viết" },
    ];

    const stages: MatchCard[][] = [cards.slice(0, 6), cards.slice(6)];
    const resolved = resolveStageConflicts(stages);

    // After resolving, stage 0 should not contain both c1 and c2
    const stage0Ids = resolved[0].map((c) => c.id);
    const hasBothInStage0 = stage0Ids.includes("c1") && stage0Ids.includes("c2");
    expect(hasBothInStage0).toBe(false);

    // All 8 cards are still preserved
    const allIds = resolved.flatMap((s) => s.map((c) => c.id));
    expect(new Set(allIds).size).toBe(8);
  });

  it("checkMatch correctly validates matching tiles and rejects invalid combinations", () => {
    const stageCards: MatchCard[] = [
      { id: "c1", term: "apple", meaningVi: "quả táo" },
      { id: "c2", term: "banana", meaningVi: "quả chuối" },
    ];

    const tile1Term: MatchTile = { id: "tile_c1_term", cardId: "c1", type: "term", text: "apple" };
    const tile1Meaning: MatchTile = { id: "tile_c1_meaning", cardId: "c1", type: "meaning", text: "quả táo" };
    const tile2Term: MatchTile = { id: "tile_c2_term", cardId: "c2", type: "term", text: "banana" };
    const tile2Meaning: MatchTile = { id: "tile_c2_meaning", cardId: "c2", type: "meaning", text: "quả chuối" };

    // 1. Correct match
    expect(checkMatch(tile1Term, tile1Meaning, stageCards)).toBe(true);
    expect(checkMatch(tile1Meaning, tile1Term, stageCards)).toBe(true);

    // 2. Mismatched pair
    expect(checkMatch(tile1Term, tile2Meaning, stageCards)).toBe(false);
    expect(checkMatch(tile2Term, tile1Meaning, stageCards)).toBe(false);

    // 3. Same tile matched with itself
    expect(checkMatch(tile1Term, tile1Term, stageCards)).toBe(false);

    // 4. Same type (term with term, meaning with meaning)
    expect(checkMatch(tile1Term, tile2Term, stageCards)).toBe(false);
    expect(checkMatch(tile1Meaning, tile2Meaning, stageCards)).toBe(false);
  });

  it("checkMatch handles equivalent semantic matches if identical definitions exist", () => {
    const stageCards: MatchCard[] = [
      { id: "c1", term: "fast", meaningVi: "nhanh" },
      { id: "c2", term: "quick", meaningVi: "nhanh" }, // same meaning
    ];

    const tileQuickTerm: MatchTile = { id: "tile_c2_term", cardId: "c2", type: "term", text: "quick" };
    const tileFastMeaning: MatchTile = { id: "tile_c1_meaning", cardId: "c1", type: "meaning", text: "nhanh" };

    // Even if cardId differs (c2 vs c1), since quick -> nhanh is valid in stageCards, it should be accepted
    expect(checkMatch(tileQuickTerm, tileFastMeaning, stageCards)).toBe(true);
  });
});
