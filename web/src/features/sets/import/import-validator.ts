import type { ColumnMapping } from "./column-mapper";
import type { NewCardInput } from "@/features/sets/sets.repository";

export interface RowError {
  rowNumber: number; // 1-indexed, relative to data file (excluding header)
  field: string;
  reason: string;
  rawContent?: string;
}

export type ValidatedCard = NewCardInput & {
  originalRowNumber: number;
};

export const MAX_IMPORT_ROWS = 1000;

/**
 * Normalize arbitrary part of speech inputs to enum
 */
export function normalizePartOfSpeech(
  input?: string | null
): "noun" | "verb" | "adjective" | "adverb" | "phrase" | "other" {
  if (!input) return "other";
  const raw = input
    .toLowerCase()
    .trim()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

  if (["n", "noun", "danhtu"].includes(raw)) return "noun";
  if (["v", "verb", "dongtu"].includes(raw)) return "verb";
  if (["adj", "adjective", "tinhtu"].includes(raw)) return "adjective";
  if (["adv", "adverb", "trangtu", "photu"].includes(raw)) return "adverb";
  if (["phrase", "cumtu", "idiom"].includes(raw)) return "phrase";

  return "other";
}

/**
 * Normalize CEFR level
 */
export function normalizeCefrLevel(
  input?: string | null
): "A1" | "A2" | "B1" | null {
  if (!input) return null;
  const upper = input.toUpperCase().trim();
  if (["A1", "A2", "B1"].includes(upper)) {
    return upper as "A1" | "A2" | "B1";
  }
  return null;
}

/**
 * Validate parsed raw rows with column mapping
 */
export function validateImportRows(
  rows: string[][],
  mapping: ColumnMapping,
  options: { hasHeaderRow?: boolean } = {}
): {
  validCards: ValidatedCard[];
  errors: RowError[];
  totalRows: number;
} {
  const { hasHeaderRow = true } = options;
  const dataRows = hasHeaderRow ? rows.slice(1) : rows;

  const validCards: ValidatedCard[] = [];
  const errors: RowError[] = [];

  if (dataRows.length > MAX_IMPORT_ROWS) {
    errors.push({
      rowNumber: 0,
      field: "file",
      reason: `Tệp vượt quá giới hạn tối đa ${MAX_IMPORT_ROWS} thẻ (hiện có ${dataRows.length} dòng).`,
    });
    return { validCards: [], errors, totalRows: dataRows.length };
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + (hasHeaderRow ? 2 : 1); // 1-indexed for human display

    const term = (row[mapping.termIndex] || "").trim();
    const meaningVi = (row[mapping.meaningViIndex] || "").trim();

    if (!term) {
      errors.push({
        rowNumber,
        field: "term",
        reason: "Từ tiếng Anh không được để trống",
        rawContent: row.join(" | "),
      });
      continue;
    }

    if (term.length > 80) {
      errors.push({
        rowNumber,
        field: "term",
        reason: "Từ tiếng Anh vượt quá 80 ký tự",
        rawContent: term,
      });
      continue;
    }

    if (!meaningVi) {
      errors.push({
        rowNumber,
        field: "meaningVi",
        reason: "Nghĩa tiếng Việt không được để trống",
        rawContent: row.join(" | "),
      });
      continue;
    }

    if (meaningVi.length > 300) {
      errors.push({
        rowNumber,
        field: "meaningVi",
        reason: "Nghĩa tiếng Việt vượt quá 300 ký tự",
        rawContent: meaningVi,
      });
      continue;
    }

    const posRaw =
      mapping.partOfSpeechIndex !== undefined ? row[mapping.partOfSpeechIndex] : undefined;
    const partOfSpeech = normalizePartOfSpeech(posRaw);

    const ipaRaw = mapping.ipaIndex !== undefined ? row[mapping.ipaIndex] : undefined;
    const ipa = ipaRaw ? ipaRaw.trim().slice(0, 120) : null;

    const cefrRaw = mapping.cefrLevelIndex !== undefined ? row[mapping.cefrLevelIndex] : undefined;
    const cefrLevel = normalizeCefrLevel(cefrRaw);

    const exampleEnRaw =
      mapping.exampleEnIndex !== undefined ? row[mapping.exampleEnIndex] : undefined;
    const exampleEn = exampleEnRaw ? exampleEnRaw.trim().slice(0, 500) : null;

    const exampleViRaw =
      mapping.exampleViIndex !== undefined ? row[mapping.exampleViIndex] : undefined;
    const exampleVi = exampleViRaw ? exampleViRaw.trim().slice(0, 500) : null;

    validCards.push({
      term,
      meaningVi,
      partOfSpeech,
      ipa,
      cefrLevel,
      exampleEn,
      exampleVi,
      acceptedAnswers: [term],
      position: validCards.length,
      originalRowNumber: rowNumber,
    });
  }

  return {
    validCards,
    errors,
    totalRows: dataRows.length,
  };
}
