import { describe, it, expect } from "vitest";
import { parseCsv } from "@/features/sets/import/csv-parser";
import {
  detectColumnMapping,
  validateColumnMapping,
} from "@/features/sets/import/column-mapper";
import {
  validateImportRows,
  normalizePartOfSpeech,
  normalizeCefrLevel,
} from "@/features/sets/import/import-validator";
import {
  chunkValidatedCards,
  buildDeterministicImportKey,
} from "@/features/sets/import/import-chunker";

describe("T06 Unit Tests - CSV Parser and Import Pipeline", () => {
  describe("parseCsv", () => {
    it("parses simple unquoted CSV", () => {
      const csv = "term,meaning,pos\napple,quả táo,noun\nrun,chạy,verb";
      const rows = parseCsv(csv);
      expect(rows).toEqual([
        ["term", "meaning", "pos"],
        ["apple", "quả táo", "noun"],
        ["run", "chạy", "verb"],
      ]);
    });

    it("parses quoted cells containing commas", () => {
      const csv = 'term,meaning,pos\n"bread, butter and jam","bánh mì, bơ và mứt",phrase';
      const rows = parseCsv(csv);
      expect(rows).toEqual([
        ["term", "meaning", "pos"],
        ["bread, butter and jam", "bánh mì, bơ và mứt", "phrase"],
      ]);
    });

    it("parses escaped quotes inside quoted cells", () => {
      const csv = 'term,meaning\n"say ""hello"" to him","chào anh ấy"';
      const rows = parseCsv(csv);
      expect(rows).toEqual([
        ["term", "meaning"],
        ['say "hello" to him', "chào anh ấy"],
      ]);
    });

    it("parses newlines inside quoted cells correctly", () => {
      const csv = 'term,example\napple,"An apple a day\nkeeps the doctor away."';
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1][0]).toBe("apple");
      expect(rows[1][1]).toBe("An apple a day\nkeeps the doctor away.");
    });

    it("strips UTF-8 BOM if present", () => {
      const csv = "\uFEFFterm,meaning\nbook,sách";
      const rows = parseCsv(csv);
      expect(rows[0][0]).toBe("term");
      expect(rows[1][0]).toBe("book");
      expect(rows[1][1]).toBe("sách");
    });

    it("handles Vietnamese Unicode characters cleanly", () => {
      const csv = "từ vựng,nghĩa,ví dụ\nkiên cường,bền bỉ,Anh ấy rất kiên cường.";
      const rows = parseCsv(csv);
      expect(rows[1][0]).toBe("kiên cường");
      expect(rows[1][1]).toBe("bền bỉ");
      expect(rows[1][2]).toBe("Anh ấy rất kiên cường.");
    });

    it("ignores trailing empty lines and CRLF", () => {
      const csv = "term,meaning\r\ncat,mèo\r\n\r\n\r\n";
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1]).toEqual(["cat", "mèo"]);
    });
  });

  describe("detectColumnMapping & validateColumnMapping", () => {
    it("auto detects Vietnamese column headers", () => {
      const headers = ["Từ tiếng Anh", "Nghĩa tiếng Việt", "Từ loại", "Phiên âm", "Ví dụ"];
      const mapping = detectColumnMapping(headers);

      expect(mapping.termIndex).toBe(0);
      expect(mapping.meaningViIndex).toBe(1);
      expect(mapping.partOfSpeechIndex).toBe(2);
      expect(mapping.ipaIndex).toBe(3);
      expect(mapping.exampleEnIndex).toBe(4);
    });

    it("auto detects English column headers", () => {
      const headers = ["Word", "Meaning", "POS", "Pronunciation", "Sentence"];
      const mapping = detectColumnMapping(headers);

      expect(mapping.termIndex).toBe(0);
      expect(mapping.meaningViIndex).toBe(1);
      expect(mapping.partOfSpeechIndex).toBe(2);
      expect(mapping.ipaIndex).toBe(3);
      expect(mapping.exampleEnIndex).toBe(4);
    });

    it("validates that required columns are not identical or out of range", () => {
      const valid = validateColumnMapping({ termIndex: 0, meaningViIndex: 1 }, 2);
      expect(valid.isValid).toBe(true);

      const sameCols = validateColumnMapping({ termIndex: 0, meaningViIndex: 0 }, 2);
      expect(sameCols.isValid).toBe(false);

      const outOfRange = validateColumnMapping({ termIndex: 0, meaningViIndex: 5 }, 2);
      expect(outOfRange.isValid).toBe(false);
    });
  });

  describe("import-validator", () => {
    it("normalizes diverse part of speech labels", () => {
      expect(normalizePartOfSpeech("n")).toBe("noun");
      expect(normalizePartOfSpeech("Danh từ")).toBe("noun");
      expect(normalizePartOfSpeech("v")).toBe("verb");
      expect(normalizePartOfSpeech("động từ")).toBe("verb");
      expect(normalizePartOfSpeech("adj")).toBe("adjective");
      expect(normalizePartOfSpeech("adv")).toBe("adverb");
      expect(normalizePartOfSpeech("phrase")).toBe("phrase");
      expect(normalizePartOfSpeech("idiom")).toBe("phrase");
      expect(normalizePartOfSpeech("unknown_pos")).toBe("other");
    });

    it("normalizes CEFR levels", () => {
      expect(normalizeCefrLevel("a1")).toBe("A1");
      expect(normalizeCefrLevel("A2")).toBe("A2");
      expect(normalizeCefrLevel("B1")).toBe("B1");
      expect(normalizeCefrLevel("C2")).toBeNull();
    });

    it("validates rows and returns row errors with accurate 1-indexed numbers", () => {
      const rows = [
        ["term", "meaning", "pos"],
        ["dog", "con chó", "noun"],
        ["", "chỉ có nghĩa không có từ", "noun"], // row 3 invalid: missing term
        ["cat", "", "noun"], // row 4 invalid: missing meaning
        ["a".repeat(85), "quá dài", "noun"], // row 5 invalid: term too long
        ["bird", "con chim", "noun"],
      ];

      const mapping = { termIndex: 0, meaningViIndex: 1, partOfSpeechIndex: 2 };
      const result = validateImportRows(rows, mapping, { hasHeaderRow: true });

      expect(result.validCards).toHaveLength(2);
      expect(result.validCards[0].term).toBe("dog");
      expect(result.validCards[1].term).toBe("bird");

      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].rowNumber).toBe(3);
      expect(result.errors[0].field).toBe("term");

      expect(result.errors[1].rowNumber).toBe(4);
      expect(result.errors[1].field).toBe("meaningVi");

      expect(result.errors[2].rowNumber).toBe(5);
      expect(result.errors[2].field).toBe("term");
    });

    it("rejects file exceeding max 1,000 cards limit", () => {
      const header = ["term", "meaning"];
      const bigRows = [header, ...Array.from({ length: 1005 }, (_, i) => [`word_${i}`, `nghĩa ${i}`])];

      const mapping = { termIndex: 0, meaningViIndex: 1 };
      const result = validateImportRows(bigRows, mapping, { hasHeaderRow: true });

      expect(result.validCards).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("file");
      expect(result.errors[0].reason).toContain("1000");
    });
  });

  describe("import-chunker", () => {
    it("splits cards into chunks of at most 100", () => {
      const mockCards = Array.from({ length: 245 }, (_, i) => ({
        term: `term_${i}`,
        meaningVi: `meaning_${i}`,
        partOfSpeech: "noun" as const,
        position: i,
        acceptedAnswers: [`term_${i}`],
        originalRowNumber: i + 2,
      }));

      const chunks = chunkValidatedCards(mockCards, "batch_123", 0);
      expect(chunks).toHaveLength(3);
      expect(chunks[0].cards).toHaveLength(100);
      expect(chunks[1].cards).toHaveLength(100);
      expect(chunks[2].cards).toHaveLength(45);
    });

    it("builds deterministic import_key for duplicate retry protection", () => {
      const key1 = buildDeterministicImportKey("batch_abc", 0, "Hello World");
      const key2 = buildDeterministicImportKey("batch_abc", 0, "Hello World");
      const key3 = buildDeterministicImportKey("batch_abc", 1, "Hello World");

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).toContain("hello_world");
    });
  });
});
