import { describe, expect, it } from "vitest";
import { DialogueOutputSchema } from "@/features/ai/schemas";
import {
  generateAiBatchContent,
  type AiProvider,
} from "@/features/ai/service.server";
import { DEMO_DIALOGUE } from "@/data/demo/dialogue.demo";
import { studyModeHref } from "@/features/study/modes";

const card = {
  id: DEMO_DIALOGUE.usedCardIds[0],
  term: "apple",
  meaningVi: "quả táo",
  partOfSpeech: "noun",
};
const provider = (output: unknown): AiProvider => ({
  generate: async (modelId) => ({ modelId, text: JSON.stringify(output) }),
});
describe("English dialogue contracts", () => {
  it("accepts a coherent alternating conversation and rejects invalid roles", () => {
    expect(DialogueOutputSchema.safeParse(DEMO_DIALOGUE).success).toBe(true);
    const invalid = structuredClone(DEMO_DIALOGUE);
    invalid.turns[1].role = "A";
    expect(DialogueOutputSchema.safeParse(invalid).success).toBe(false);
  });
  it("generates through the existing provider adapter with structured output", async () => {
    const result = await generateAiBatchContent("dialogue", [card], {
      injectedProvider: provider(DEMO_DIALOGUE),
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(DEMO_DIALOGUE);
  });
  it("rejects an invented card ID in any turn", async () => {
    const invalid = structuredClone(DEMO_DIALOGUE);
    invalid.turns[1].cardId = "99999999-9999-4999-8999-999999999999";
    const result = await generateAiBatchContent("dialogue", [card], {
      injectedProvider: provider(invalid),
    });
    expect(result.success).toBe(false);
  });
  it("rejects missing card coverage and duplicated declared card IDs", async () => {
    const missing = await generateAiBatchContent(
      "dialogue",
      [card, { ...card, id: "99999999-9999-4999-8999-999999999999" }],
      { injectedProvider: provider(DEMO_DIALOGUE) },
    );
    expect(missing.success).toBe(false);
    const invalid = { ...DEMO_DIALOGUE, usedCardIds: [card.id, card.id] };
    expect(
      (
        await generateAiBatchContent("dialogue", [card], {
          injectedProvider: provider(invalid),
        })
      ).success,
    ).toBe(false);
  });
  it("resumes flashcards inline and preserves the Word Blaster mode", () => {
    expect(studyModeHref("set", "flashcard")).toBe("/sets/set#flashcard-arena");
    expect(studyModeHref("set", "arcade_recall")).toBe(
      "/sets/set/arcade?mode=recall",
    );
    expect(studyModeHref("set", "dialogue")).toBe("/sets/set/dialogue");
  });
});
