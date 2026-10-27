import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

describe("T18 - Dataset & Content Manifest Verification (P11)", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const betaSeedPath = path.join(rootDir, "examples/beta-vocabulary.seed.json");
  const reviewReportPath = path.join(rootDir, "reports/content-review.md");

  it("ensures beta seed file and content review report exist", () => {
    expect(fs.existsSync(betaSeedPath)).toBe(true);
    expect(fs.existsSync(reviewReportPath)).toBe(true);
  });

  it("verifies beta dataset contains >= 30 reviewed cards with valid metadata", () => {
    const rawContent = fs.readFileSync(betaSeedPath, "utf8");
    const dataset = JSON.parse(rawContent);

    expect(dataset.schemaVersion).toBe(1);
    expect(dataset.metadata.reviewStatus).toBe("reviewed");
    expect(dataset.metadata.reviewer).toBeTruthy();
    expect(dataset.metadata.license).toBe("CC-BY-4.0");

    let totalCards = 0;
    const cardIds = new Set<string>();

    for (const set of dataset.sets) {
      expect(set.language).toBe("en");
      expect(["A1", "A2", "B1"]).toContain(set.cefrLevel);
      const positions = new Set<number>();

      for (const card of set.cards) {
        totalCards++;

        // Duplicate checks
        expect(cardIds.has(card.id)).toBe(false);
        cardIds.add(card.id);

        expect(positions.has(card.position)).toBe(false);
        positions.add(card.position);

        // Required pedagogical fields
        expect(card.reviewStatus).toBe("reviewed");
        expect(card.ipa).toMatch(/^\/.*\/$/); // valid IPA syntax
        expect(card.meaningVi.length).toBeGreaterThan(0);
        expect(card.exampleEn.length).toBeGreaterThan(0);
        expect(card.exampleVi.length).toBeGreaterThan(0);

        // Canonical term check in acceptedAnswers
        const termNorm = card.term.trim().toLowerCase();
        const hasCanonical = card.acceptedAnswers.some(
          (ans: string) => ans.trim().toLowerCase() === termNorm
        );
        expect(hasCanonical).toBe(true);
      }
    }

    // Must exceed the minimum requirement of 30 cards
    expect(totalCards).toBeGreaterThanOrEqual(30);
  });

  it("verifies SHA-256 integrity hash matches content review report", () => {
    const rawContent = fs.readFileSync(betaSeedPath, "utf8");
    const computedHash = crypto.createHash("sha256").update(rawContent).digest("hex");

    const reportContent = fs.readFileSync(reviewReportPath, "utf8");
    expect(reportContent).toContain(computedHash);
  });

  it("verifies zero HSK, pinyin, or Chinese tags exist in the beta dataset", () => {
    const rawContent = fs.readFileSync(betaSeedPath, "utf8").toLowerCase();
    expect(rawContent).not.toContain("hsk");
    expect(rawContent).not.toContain("pinyin");
    expect(rawContent).not.toContain("chinesesentence");
    expect(rawContent).not.toContain("zh-cn");
  });
});
