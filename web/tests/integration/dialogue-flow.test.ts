import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import {
  createOrResumeSession,
  recordServerAttempt,
} from "@/features/study/sessions.repository";
import { getOrCreateAiBatch } from "@/features/ai/ai.repository";
import type { DialogueOutput } from "@/features/ai/schemas";

describe("Dialogue cache, persistence, and grading", () => {
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const users: string[] = [];
  let setId: string, cardId: string, revision: number, output: DialogueOutput;
  let calls = 0;
  const provider = {
    generate: async (modelId: string) => {
      calls++;
      return { modelId, text: JSON.stringify(output) };
    },
  };
  const getBatch = () =>
    getOrCreateAiBatch({
      userId: users[0],
      setId,
      mode: "dialogue",
      cards: [
        {
          id: cardId,
          term: "apple",
          meaningVi: "quả táo",
          partOfSpeech: "noun",
        },
      ],
      contentRevision: revision,
      injectedProvider: provider,
    });
  beforeAll(async () => {
    for (const index of [0, 1]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `dialogue_${Date.now()}_${index}@example.com`,
        password: "Dialogue-Test-Only-123!",
        email_confirm: true,
      });
      if (error || !data.user) throw error || new Error("User fixture missing");
      users.push(data.user.id);
    }
    const { data: set, error: setError } = await admin
      .from("learning_sets")
      .insert({
        owner_id: users[0],
        title: "Dialogue integration fixture",
        topic: "test",
        cefr_level: "A1",
        is_public: true,
      })
      .select("id")
      .single();
    if (setError || !set) throw setError || new Error("Set fixture missing");
    setId = set.id;
    const { data: card, error: cardError } = await admin
      .from("vocabulary_cards")
      .insert({
        set_id: setId,
        term: "apple",
        meaning_vi: "quả táo",
        part_of_speech: "noun",
        accepted_answers: ["apple"],
        position: 0,
      })
      .select("id")
      .single();
    if (cardError || !card)
      throw cardError || new Error("Card fixture missing");
    cardId = card.id;
    const { data: version } = await admin
      .from("learning_sets")
      .select("content_revision")
      .eq("id", setId)
      .single();
    revision = version!.content_revision;
    output = {
      title: "An apple",
      situationVi: "Hai người bạn chia sẻ bữa ăn nhẹ.",
      level: "A1",
      usedCardIds: [cardId],
      turns: [
        {
          role: "A",
          cardId,
          textEn: "Would you like an apple?",
          textVi: "Bạn có muốn ăn một quả táo không?",
        },
        {
          role: "B",
          cardId,
          textEn: "Yes, I would like an apple.",
          textVi: "Có, mình muốn một quả táo.",
        },
        {
          role: "A",
          cardId,
          textEn: "Here is an apple for you.",
          textVi: "Đây là một quả táo dành cho bạn.",
        },
        {
          role: "B",
          cardId,
          textEn: "Thank you for the apple.",
          textVi: "Cảm ơn bạn về quả táo.",
        },
      ],
    };
  });
  afterAll(async () => {
    for (const id of users) {
      await admin.from("ai_usage_daily").delete().eq("scope_key", `user:${id}`);
      await admin
        .from("ai_rate_buckets")
        .delete()
        .eq("scope_key", `user:${id}`);
      await admin.auth.admin.deleteUser(id);
    }
  });
  it("persists a dialogue batch and hits the durable cache without another provider call", async () => {
    const first = await getBatch();
    expect(first.status).toBe("ready");
    expect(first.cached).toBe(false);
    expect(calls).toBe(1);
    const again = await getBatch();
    expect(again.status).toBe("ready");
    expect(again.cached).toBe(true);
    expect(calls).toBe(1);
    expect(again.batchId).toBe(first.batchId);
  });
  it("grades the cached full utterance rather than accepting the vocabulary word alone", async () => {
    const batch = await getBatch();
    const { session } = await createOrResumeSession({
      userId: users[0],
      setId,
      mode: "dialogue",
      action: "restart",
    });
    const wrong = await recordServerAttempt({
      userId: users[0],
      sessionId: session.id,
      cardId,
      clientEventId: crypto.randomUUID(),
      questionKey: `ai:${batch.batchId}:0`,
      attemptKind: "answer",
      userAnswer: "apple",
      activeElapsedMs: 100,
      expectedVersion: session.state_version,
    });
    expect(wrong.success).toBe(true);
    expect(wrong.is_correct).toBe(false);
    const correct = await recordServerAttempt({
      userId: users[0],
      sessionId: session.id,
      cardId,
      clientEventId: crypto.randomUUID(),
      questionKey: `ai:${batch.batchId}:0`,
      attemptKind: "answer",
      userAnswer: "Would you like an apple?",
      activeElapsedMs: 100,
      expectedVersion: wrong.version!,
    });
    expect(correct.success).toBe(true);
    expect(correct.is_correct).toBe(true);
    const resumed = await createOrResumeSession({
      userId: users[0],
      setId,
      mode: "dialogue",
      action: "resume_or_create",
    });
    expect(resumed.session.id).toBe(session.id);
  });
  it("rejects another user's cache and an out-of-range dialogue turn", async () => {
    const batch = await getBatch();
    const { session } = await createOrResumeSession({
      userId: users[1],
      setId,
      mode: "dialogue",
      action: "restart",
    });
    const denied = await recordServerAttempt({
      userId: users[1],
      sessionId: session.id,
      cardId,
      clientEventId: crypto.randomUUID(),
      questionKey: `ai:${batch.batchId}:0`,
      attemptKind: "answer",
      userAnswer: output.turns[0].textEn,
      activeElapsedMs: 100,
      expectedVersion: session.state_version,
    });
    expect(denied.success).toBe(false);
    expect(denied.code).toBe("INVALID_ANSWER");
    const own = await createOrResumeSession({
      userId: users[0],
      setId,
      mode: "dialogue",
      action: "resume_or_create",
    });
    const invalid = await recordServerAttempt({
      userId: users[0],
      sessionId: own.session.id,
      cardId,
      clientEventId: crypto.randomUUID(),
      questionKey: `ai:${batch.batchId}:999`,
      attemptKind: "answer",
      userAnswer: output.turns[0].textEn,
      activeElapsedMs: 100,
      expectedVersion: own.session.state_version,
    });
    expect(invalid.success).toBe(false);
    expect(invalid.code).toBe("INVALID_CARD_MEMBERSHIP");
  });
});
