export type CardFieldKey =
  | "term"
  | "meaningVi"
  | "partOfSpeech"
  | "ipa"
  | "cefrLevel"
  | "exampleEn"
  | "exampleVi";

export interface ColumnMapping {
  termIndex: number;
  meaningViIndex: number;
  partOfSpeechIndex?: number;
  ipaIndex?: number;
  cefrLevelIndex?: number;
  exampleEnIndex?: number;
  exampleViIndex?: number;
}

const FIELD_ALIASES: Record<CardFieldKey, string[]> = {
  term: [
    "term",
    "word",
    "vocabulary",
    "vocab",
    "english",
    "từ",
    "tu",
    "tiếng anh",
    "tieng anh",
    "từ tiếng anh",
    "tu tieng anh",
  ],
  meaningVi: [
    "meaning",
    "meaning_vi",
    "meaningvi",
    "definition",
    "vietnamese",
    "nghĩa",
    "nghia",
    "nghĩa tiếng việt",
    "nghia tieng viet",
    "dịch",
    "dich",
    "giải nghĩa",
    "giai nghia",
  ],
  partOfSpeech: [
    "pos",
    "part_of_speech",
    "partofspeech",
    "part of speech",
    "loại từ",
    "loai tu",
    "từ loại",
    "tu loai",
    "type",
  ],
  ipa: [
    "ipa",
    "phonetic",
    "pronunciation",
    "phiên âm",
    "phien am",
    "phát âm",
    "phat am",
  ],
  cefrLevel: [
    "cefr",
    "cefr_level",
    "level",
    "trình độ",
    "trinh do",
    "cấp độ",
    "cap do",
  ],
  exampleEn: [
    "example",
    "example_en",
    "sentence",
    "context",
    "ví dụ",
    "vi du",
    "câu ví dụ",
    "cau vi du",
  ],
  exampleVi: [
    "example_vi",
    "dịch ví dụ",
    "dich vi du",
    "nghĩa câu",
    "nghia cau",
  ],
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents for matching
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Auto detect column mappings from header row
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map(normalizeHeader);

  const findBestIndex = (field: CardFieldKey): number => {
    const aliases = FIELD_ALIASES[field];
    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const idx = normalizedHeaders.findIndex(
        (h) => h === normalizedAlias || h.includes(normalizedAlias)
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const termIdx = findBestIndex("term");
  const meaningViIdx = findBestIndex("meaningVi");
  const posIdx = findBestIndex("partOfSpeech");
  const ipaIdx = findBestIndex("ipa");
  const cefrIdx = findBestIndex("cefrLevel");
  const exampleEnIdx = findBestIndex("exampleEn");
  const exampleViIdx = findBestIndex("exampleVi");

  return {
    termIndex: termIdx !== -1 ? termIdx : 0,
    meaningViIndex: meaningViIdx !== -1 ? meaningViIdx : (headers.length > 1 ? 1 : -1),
    partOfSpeechIndex: posIdx !== -1 ? posIdx : undefined,
    ipaIndex: ipaIdx !== -1 ? ipaIdx : undefined,
    cefrLevelIndex: cefrIdx !== -1 ? cefrIdx : undefined,
    exampleEnIndex: exampleEnIdx !== -1 ? exampleEnIdx : undefined,
    exampleViIndex: exampleViIdx !== -1 ? exampleViIdx : undefined,
  };
}

/**
 * Validate that required fields (term, meaningVi) are mapped to valid columns
 */
export function validateColumnMapping(
  mapping: ColumnMapping,
  columnCount: number
): { isValid: boolean; error?: string } {
  if (mapping.termIndex < 0 || mapping.termIndex >= columnCount) {
    return {
      isValid: false,
      error: "Chưa chọn cột chứa 'Từ tiếng Anh' (Term)",
    };
  }

  if (mapping.meaningViIndex < 0 || mapping.meaningViIndex >= columnCount) {
    return {
      isValid: false,
      error: "Chưa chọn cột chứa 'Nghĩa tiếng Việt' (Meaning)",
    };
  }

  if (mapping.termIndex === mapping.meaningViIndex) {
    return {
      isValid: false,
      error: "Cột 'Từ tiếng Anh' và 'Nghĩa tiếng Việt' không được trùng nhau",
    };
  }

  return { isValid: true };
}
