import { it, expect, vi } from "vitest";
import { generateAiBatchContent } from "@/features/ai/service.server";
it("does not call the provider when the atomic budget reservation fails", async () => {
  const generate = vi.fn(); const reserveProviderCall = vi.fn().mockRejectedValue(new Error("budget exhausted"));
  const result = await generateAiBatchContent("context", [{ id: crypto.randomUUID(), term: "apple", meaningVi: "quả táo", partOfSpeech: "noun" }], { injectedProvider: { generate }, reserveProviderCall });
  expect(result.errorCode).toBe("PROVIDER_BUDGET_EXCEEDED"); expect(generate).not.toHaveBeenCalled(); expect(reserveProviderCall).toHaveBeenCalledTimes(1);
});
