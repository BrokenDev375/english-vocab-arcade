import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createOrResumeSession, recordServerAttempt } from "@/features/study/sessions.repository";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
let userId = "", otherId = "", setId = "", cardId = "";
const checked = <T extends { data: unknown; error: { message: string } | null }>(result: T): NonNullable<T["data"]> => { if (result.error) throw new Error(result.error.message); return result.data as NonNullable<T["data"]>; };
beforeAll(async () => {
  for (const suffix of ["a", "b"]) {
    const created = checked(await admin.auth.admin.createUser({ email: `reliable_${Date.now()}_${suffix}@example.com`, password: "SyntheticOnlyPassword123!", email_confirm: true }));
    if (!created.user) throw new Error("Fixture creation failed");
    if (suffix === "a") userId = created.user.id; else otherId = created.user.id;
  }
  setId = checked(await admin.from("learning_sets").insert({ owner_id: userId, title: "reliable-fixture", cefr_level: "A1", topic: "test", is_public: false }).select("id").single()).id;
  cardId = checked(await admin.from("vocabulary_cards").insert({ set_id: setId, term: "apple", meaning_vi: "quả táo", part_of_speech: "noun", position: 0, accepted_answers: ["apple"] }).select("id").single()).id;
});
afterAll(async () => {
  for (const id of [userId, otherId].filter(Boolean)) {
    for (const table of ["ai_usage_daily", "ai_rate_buckets"]) checked(await admin.from(table).delete().eq("scope_key", `user:${id}`));
    checked(await admin.auth.admin.deleteUser(id));
  }
});
describe("retry and provider budgets", () => {
  it("does not grant new leases during failed-batch cooldown or bypass the minute bucket", async () => {
    const params = { p_user_id: userId, p_set_id: setId, p_mode: "context", p_card_ids: [cardId], p_content_revision: 1, p_cache_key: `retry:${randomUUID()}`, p_prompt_version: "test", p_schema_version: "test", p_lease_token: randomUUID(), p_daily_limit: 1, p_minute_limit: 1 };
    const first = checked(await admin.rpc("reserve_ai_batch_v1", params)); expect(first.status).toBe("lease_acquired");
    checked(await admin.rpc("finalize_ai_batch_v1", { p_batch_id: first.batch_id, p_lease_token: params.p_lease_token, p_status: "failed" }));
    for (let i = 0; i < 3; i++) expect(checked(await admin.rpc("reserve_ai_batch_v1", { ...params, p_lease_token: randomUUID() })).code).toBe("RETRY_COOLDOWN");
    checked(await admin.from("ai_batches").update({ retry_after: new Date(Date.now() - 1000).toISOString() }).eq("id", first.batch_id));
    expect(checked(await admin.rpc("reserve_ai_batch_v1", { ...params, p_lease_token: randomUUID() })).status).toBe("rate_limited");
  });
  it("shares the provider-call budget across users and serializes concurrent reservations", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const previous = checked(await admin.from("ai_usage_daily").select("reserved_calls").eq("scope_key", "provider:gemini").eq("usage_date", today).maybeSingle());
    const baseline = previous?.reserved_calls || 0;
    const results = await Promise.all([userId, otherId, userId].map(id => admin.rpc("reserve_ai_provider_call_v1", { p_user_id: id, p_global_daily_limit: baseline + 2, p_global_minute_limit: 100000, p_user_daily_limit: 10 })));
    expect(results.map(checked).filter(value => value.success)).toHaveLength(2);
    expect(results.map(checked).filter(value => value.code === "PROVIDER_BUDGET_EXCEEDED")).toHaveLength(1);
  });
});
it("typing hits record elapsed time once without raising verified mastery", async () => {
  const { session } = await createOrResumeSession({ userId, setId, mode: "arcade_typing" });
  const attempt = { userId, sessionId: session.id, cardId, clientEventId: randomUUID(), questionKey: "typing-test", attemptKind: "game_hit" as const, userAnswer: "apple", activeElapsedMs: 1500, expectedVersion: session.state_version };
  expect((await recordServerAttempt(attempt)).success).toBe(true);
  expect((await recordServerAttempt(attempt)).is_duplicate).toBe(true);
  const progress = checked(await admin.from("study_progress").select("correct_count").eq("user_id", userId).eq("card_id", cardId));
  expect(progress).toHaveLength(0);
  const saved = checked(await admin.from("study_sessions").select("active_elapsed_ms").eq("id", session.id).single());
  expect(saved.active_elapsed_ms).toBe(1500);
});
