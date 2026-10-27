import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";

export interface ClientCardItem {
  id: string;
  setId?: string;
  term: string;
  meaningVi: string;
  partOfSpeech: string;
  ipa?: string | null;
  cefrLevel?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  acceptedAnswers?: string[];
  position: number;
}

/**
 * Loads all cards for a set with full cursor pagination loop (solves R05).
 * Falls back to DEMO_SETS only when setId is an explicit demo ID.
 */
export async function fetchAllSetCards(setId: string): Promise<ClientCardItem[]> {
  if (!setId) return [];

  // Demo fallback only for explicit demo IDs
  if (setId.startsWith("d000")) {
    const demo = DEMO_SETS.find((s) => s.id === setId);
    const demoCards = demo?.cards || DEMO_CARDS;
    return demoCards.map((c) => ({
      id: c.id,
      setId: demo?.id || setId,
      term: c.term,
      meaningVi: c.meaningVi,
      partOfSpeech: c.partOfSpeech,
      ipa: c.ipa || null,
      cefrLevel: c.cefrLevel || null,
      exampleEn: c.exampleEn || null,
      exampleVi: c.exampleVi || null,
      acceptedAnswers: c.acceptedAnswers,
      position: c.position,
    }));
  }

  const allCards: ClientCardItem[] = [];
  let cursorPosition: number | undefined = undefined;
  let cursorId: string | undefined = undefined;

  try {
    while (true) {
      let url = `/api/sets/${setId}/cards?limit=200`;
      if (cursorPosition !== undefined && cursorId !== undefined) {
        url += `&cursorPosition=${cursorPosition}&cursorId=${cursorId}`;
      }

      const res = await fetch(url);
      if (!res.ok) break;

      const json = await res.json();
      interface RawCardApiItem {
        id: string;
        set_id?: string;
        setId?: string;
        term: string;
        meaning_vi?: string;
        meaningVi?: string;
        part_of_speech?: string;
        partOfSpeech?: string;
        ipa?: string | null;
        cefr_level?: string | null;
        cefrLevel?: string | null;
        example_en?: string | null;
        exampleEn?: string | null;
        example_vi?: string | null;
        exampleVi?: string | null;
        accepted_answers?: string[];
        acceptedAnswers?: string[];
        position: number;
      }
      const chunk: ClientCardItem[] = (json.data || []).map((c: RawCardApiItem) => ({
        id: c.id,
        setId: c.set_id || setId,
        term: c.term,
        meaningVi: c.meaning_vi || c.meaningVi || "",
        partOfSpeech: c.part_of_speech || c.partOfSpeech || "other",
        ipa: c.ipa || null,
        cefrLevel: c.cefr_level || c.cefrLevel || null,
        exampleEn: c.example_en || c.exampleEn || null,
        exampleVi: c.example_vi || c.exampleVi || null,
        acceptedAnswers: c.accepted_answers || c.acceptedAnswers || [c.term],
        position: c.position,
      }));

      if (chunk.length === 0) break;
      allCards.push(...chunk);

      if (!json.meta?.nextCursor) break;
      cursorPosition = json.meta.nextCursor.position;
      cursorId = json.meta.nextCursor.id;
    }
  } catch (err) {
    console.warn("Failed to fetch cards for set", setId, err);
  }

  return allCards;
}
