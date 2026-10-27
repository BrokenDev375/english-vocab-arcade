import { describe, it, expect } from "vitest";
import {
  generateAiBatchContent,
  type AiProvider,
  type TargetCardInfo,
} from "@/features/ai/service.server";

describe("T14 - Gemini Provider Adapter & Zod Validation", () => {
  const sampleCards: TargetCardInfo[] = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      term: "tenacious",
      meaningVi: "kiên trì",
      partOfSpeech: "adjective",
      cefrLevel: "B1",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      term: "diligent",
      meaningVi: "chăm chỉ",
      partOfSpeech: "adjective",
      cefrLevel: "A2",
    },
  ];

  it("successfully generates and validates context mode exercises", async () => {
    const mockProvider: AiProvider = {
      generate: async (modelId) => ({
        modelId,
        text: JSON.stringify({
          items: [
            {
              cardId: "11111111-1111-4111-8111-111111111111",
              sentenceEn: "She showed a tenacious spirit during difficult times.",
              sentenceVi: "Cô ấy thể hiện tinh thần kiên trì trong những lúc khó khăn.",
              targetSurface: "tenacious",
              explanationVi: "Tính từ chỉ sự kiên trì không từ bỏ.",
            },
            {
              cardId: "22222222-2222-4222-8222-222222222222",
              sentenceEn: "He is a diligent student who studies every day.",
              sentenceVi: "Cậu ấy là một học sinh chăm chỉ học bài mỗi ngày.",
              targetSurface: "diligent",
              explanationVi: "Tính từ miêu tả sự siêng năng, cần cù.",
            },
          ],
        }),
      }),
    };

    const res = await generateAiBatchContent("context", sampleCards, {
      injectedProvider: mockProvider,
    });

    expect(res.success).toBe(true);
    expect(res.modelId).toBe("gemini-2.5-flash");
    expect((res.data as { items: unknown[] }).items).toHaveLength(2);
  });

  it("rejects hallucinated card IDs not present in the requested card list", async () => {
    const mockProvider: AiProvider = {
      generate: async (modelId) => ({
        modelId,
        text: JSON.stringify({
          items: [
            {
              cardId: "99999999-9999-4999-8999-999999999999", // Hallucinated!
              sentenceEn: "An invalid sentence with an unknown card.",
              sentenceVi: "Câu không hợp lệ với thẻ không tồn tại.",
              targetSurface: "unknown",
              explanationVi: "Lỗi ID thẻ.",
            },
          ],
        }),
      }),
    };

    const res = await generateAiBatchContent("context", sampleCards, {
      injectedProvider: mockProvider,
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("PROVIDER_ERROR");
    expect(res.error).toContain("unexpected cardId");
  });

  it("falls back to secondary model when primary model encounters an error", async () => {
    const attemptedModels: string[] = [];

    const mockProvider: AiProvider = {
      generate: async (modelId) => {
        attemptedModels.push(modelId);
        if (modelId === "gemini-2.5-flash") {
          throw new Error("503 Service Unavailable");
        }
        return {
          modelId,
          text: JSON.stringify({
            items: [
              {
                cardId: "11111111-1111-4111-8111-111111111111",
                sentenceEn: "Tenacious people achieve great things.",
                sentenceVi: "Những người kiên trì đạt được nhiều thành tựu lớn.",
                targetSurface: "Tenacious",
                explanationVi: "Tính từ đứng đầu câu làm bổ ngữ.",
              },
            ],
          }),
        };
      },
    };

    const res = await generateAiBatchContent(
      "context",
      [sampleCards[0]],
      { injectedProvider: mockProvider }
    );

    expect(res.success).toBe(true);
    expect(res.modelId).toBe("gemini-1.5-flash");
    expect(attemptedModels).toEqual(["gemini-2.5-flash", "gemini-1.5-flash"]);
  });

  it("halts immediately on 401 / 403 errors without retrying", async () => {
    const attemptedModels: string[] = [];

    const mockProvider: AiProvider = {
      generate: async (modelId) => {
        attemptedModels.push(modelId);
        throw new Error("401 Unauthenticated API_KEY_INVALID");
      },
    };

    const res = await generateAiBatchContent("context", sampleCards, {
      injectedProvider: mockProvider,
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("INVALID_API_KEY");
    // Should NOT retry the second model when authentication fails!
    expect(attemptedModels).toHaveLength(1);
  });

  it("aborts when the remaining timeout budget is insufficient", async () => {
    const mockProvider: AiProvider = {
      generate: async (modelId) => ({
        modelId,
        text: "{}",
      }),
    };

    const res = await generateAiBatchContent("context", sampleCards, {
      injectedProvider: mockProvider,
      timeoutBudgetMs: 500, // < 2000ms minimum threshold
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("TIMEOUT_BUDGET_EXCEEDED");
  });
});
