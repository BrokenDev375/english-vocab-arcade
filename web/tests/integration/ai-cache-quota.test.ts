import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import { getOrCreateAiBatch } from "@/features/ai/ai.repository";
import type { AiProvider, TargetCardInfo } from "@/features/ai/service.server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("T15 Integration Tests - Persistent AI Cache & Quota (E07, D11)", () => {
  let adminClient: SupabaseClient<Database>;
  let userAId: string;
  let userBId: string;
  let setAId: string;
  let cardAId: string;
  let sampleCards: TargetCardInfo[];

  beforeAll(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

    const emailA = `ai_user_a_${Date.now()}@example.com`;
    const emailB = `ai_user_b_${Date.now()}@example.com`;
    const password = "Password123!Secure";

    const { data: createdA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User A AI" },
    });
    userAId = createdA!.user!.id;

    const { data: createdB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User B AI" },
    });
    userBId = createdB!.user!.id;

    // Create Set and Card
    const { data: setA } = await adminClient
      .from("learning_sets")
      .insert({
        owner_id: userAId,
        title: "AI Exercise Set",
        cefr_level: "B1",
        topic: "business",
        is_public: true,
      })
      .select("id")
      .single();
    setAId = setA!.id;

    const { data: cardA } = await adminClient
      .from("vocabulary_cards")
      .insert({
        set_id: setAId,
        term: "negotiation",
        meaning_vi: "cuộc đàm phán",
        part_of_speech: "noun",
        position: 0,
        accepted_answers: ["negotiation"],
      })
      .select("id")
      .single();
    cardAId = cardA!.id;

    sampleCards = [
      {
        id: cardAId,
        term: "negotiation",
        meaningVi: "cuộc đàm phán",
        partOfSpeech: "noun",
        cefrLevel: "B1",
      },
    ];
  });

  it("E07: first call generates batch, second identical call hits persistent cache without calling provider", async () => {
    let providerCallCount = 0;

    const mockProvider: AiProvider = {
      generate: async (modelId) => {
        providerCallCount++;
        return {
          modelId,
          text: JSON.stringify({
            items: [
              {
                cardId: cardAId,
                sentenceEn: "The negotiation lasted for three hours.",
                sentenceVi: "Cuộc đàm phán kéo dài trong ba giờ.",
                targetSurface: "negotiation",
                explanationVi: "Danh từ chỉ quá trình thảo luận để đạt thỏa thuận.",
              },
            ],
          }),
        };
      },
    };

    // 1. First Call: Should acquire lease, invoke provider, and save to database
    const batch1 = await getOrCreateAiBatch({
      userId: userAId,
      setId: setAId,
      mode: "context",
      cards: sampleCards,
      contentRevision: 1,
      targetLevel: "B1",
      nonce: 0,
      injectedProvider: mockProvider,
    });

    expect(batch1.status).toBe("ready");
    expect(batch1.cached).toBeFalsy();
    expect(providerCallCount).toBe(1);

    // 2. Second Call with EXACT same inputs: MUST HIT CACHE!
    const batch2 = await getOrCreateAiBatch({
      userId: userAId,
      setId: setAId,
      mode: "context",
      cards: sampleCards,
      contentRevision: 1,
      targetLevel: "B1",
      nonce: 0,
      injectedProvider: mockProvider,
    });

    expect(batch2.status).toBe("ready");
    expect(batch2.cached).toBe(true);
    expect(batch2.batchId).toBe(batch1.batchId);
    // Provider MUST NOT have been called a second time!
    expect(providerCallCount).toBe(1);
  });

  it("differentiates cache keys when nonce is changed and generates a new distinct batch", async () => {
    let providerCallCount = 0;

    const mockProvider: AiProvider = {
      generate: async (modelId) => {
        providerCallCount++;
        return {
          modelId,
          text: JSON.stringify({
            items: [
              {
                cardId: cardAId,
                sentenceEn: "A successful negotiation requires patience.",
                sentenceVi: "Một cuộc đàm phán thành công đòi hỏi sự kiên nhẫn.",
                targetSurface: "negotiation",
                explanationVi: "Ví dụ thay thế khi bấm Tạo câu khác.",
              },
            ],
          }),
        };
      },
    };

    const batchNonce1 = await getOrCreateAiBatch({
      userId: userAId,
      setId: setAId,
      mode: "context",
      cards: sampleCards,
      contentRevision: 1,
      targetLevel: "B1",
      nonce: 1, // Nonce changed!
      injectedProvider: mockProvider,
    });

    expect(batchNonce1.status).toBe("ready");
    expect(providerCallCount).toBe(1);
  });

  it("D11: strictly enforces daily limits and returns quota_exceeded when limit is reached", async () => {
    const testUser = userBId;
    let providerCalls = 0;

    const mockProvider: AiProvider = {
      generate: async (modelId) => {
        providerCalls++;
        return {
          modelId,
          text: JSON.stringify({
            items: [
              {
                cardId: cardAId,
                sentenceEn: "Test sentence for quota.",
                sentenceVi: "Câu kiểm tra hạn mức.",
                targetSurface: "negotiation",
                explanationVi: "Giải thích hạn mức.",
              },
            ],
          }),
        };
      },
    };

    // Set daily limit to 2 for this test
    const dailyLimit = 2;

    // Call 1: Success
    const res1 = await getOrCreateAiBatch({
      userId: testUser,
      setId: setAId,
      mode: "context",
      cards: sampleCards,
      contentRevision: 1,
      nonce: 10,
      dailyLimit,
      injectedProvider: mockProvider,
    });
    expect(res1.status).toBe("ready");

    // Call 2: Success
    const res2 = await getOrCreateAiBatch({
      userId: testUser,
      setId: setAId,
      mode: "context",
      cards: sampleCards,
      contentRevision: 1,
      nonce: 20,
      dailyLimit,
      injectedProvider: mockProvider,
    });
    expect(res2.status).toBe("ready");

    // Call 3: Quota exceeded!
    const res3 = await getOrCreateAiBatch({
      userId: testUser,
      setId: setAId,
      mode: "context",
      cards: sampleCards,
      contentRevision: 1,
      nonce: 30,
      dailyLimit,
      injectedProvider: mockProvider,
    });

    expect(res3.status).toBe("quota_exceeded");
    expect(res3.code).toBe("DAILY_QUOTA_EXCEEDED");
    // Provider calls should only have been 2 (stopped before calling provider on 3rd attempt)
    expect(providerCalls).toBe(2);
  });

  it("R07 Integrity: Does not report ready if finalization fails", async () => {
    // Call finalize directly with invalid lease token to simulate stolen/expired lease
    const fakeBatchId = "00000000-0000-0000-0000-000000000001";
    const fakeLease = "00000000-0000-0000-0000-000000000002";

    const { data: finalizeRes } = await adminClient.rpc("finalize_ai_batch_v1", {
      p_batch_id: fakeBatchId,
      p_lease_token: fakeLease,
      p_status: "ready",
      p_output: {},
      p_model_id: "gemini-2.5-flash",
    });

    const res = finalizeRes as { success: boolean; code?: string };
    expect(res.success).toBe(false);
    expect(res.code).toBe("NOT_FOUND");
  });
});
