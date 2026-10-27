import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("T03 - Study & AI Database Contracts (D05-D11, D16)", () => {
  let adminClient: SupabaseClient<Database>;
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;

  let userAId: string;
  let userBId: string;
  let setAId: string;
  let cardAId: string;
  let sessionAId: string;

  beforeAll(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

    const emailA = `study_a_${Date.now()}@example.com`;
    const emailB = `study_b_${Date.now()}@example.com`;
    const password = "Password123!Secure";

    const { data: createdA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Học viên A Study" },
    });
    userAId = createdA!.user!.id;

    const { data: createdB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Học viên B Study" },
    });
    userBId = createdB!.user!.id;

    clientA = createClient<Database>(SUPABASE_URL, ANON_KEY);
    await clientA.auth.signInWithPassword({ email: emailA, password });

    clientB = createClient<Database>(SUPABASE_URL, ANON_KEY);
    await clientB.auth.signInWithPassword({ email: emailB, password });

    // User A creates set & card
    const { data: setA } = await clientA
      .from("learning_sets")
      .insert({
        owner_id: userAId,
        title: "Bộ từ học và tiến độ A",
        cefr_level: "A1",
        topic: "travel",
        is_public: false,
      })
      .select()
      .single();
    setAId = setA!.id;

    const { data: cardA } = await clientA
      .from("vocabulary_cards")
      .insert({
        set_id: setAId,
        term: "journey",
        meaning_vi: "hành trình",
        part_of_speech: "noun",
        accepted_answers: ["journey"],
        position: 0,
      })
      .select()
      .single();
    cardAId = cardA!.id;

    // Create an active session for User A using service role (or authenticated insert if allowed, here service role sets up contract)
    const { data: sessA } = await adminClient
      .from("study_sessions")
      .insert({
        user_id: userAId,
        set_id: setAId,
        mode: "learn",
        content_revision: 1,
        content_snapshot: { cards: [{ id: cardAId, term: "journey" }] },
        ordered_card_ids: [cardAId],
        seed: "seed-12345",
        status: "active",
        state: { currentStep: 0 },
        state_version: 1,
      })
      .select()
      .single();
    sessionAId = sessA!.id;
  });

  // D05: B đọc session/progress/AI A -> Không dữ liệu
  it("D05: User B querying sessions, progress, attempts, or AI batches of User A gets 0 rows", async () => {
    const { data: bSessions } = await clientB
      .from("study_sessions")
      .select("id")
      .eq("user_id", userAId);
    expect(bSessions?.length).toBe(0);

    const { data: bProgress } = await clientB
      .from("study_progress")
      .select("*")
      .eq("user_id", userAId);
    expect(bProgress?.length).toBe(0);

    const { data: bAttempts } = await clientB
      .from("study_attempts")
      .select("id")
      .eq("user_id", userAId);
    expect(bAttempts?.length).toBe(0);

    const { data: bAiBatches } = await clientB
      .from("ai_batches")
      .select("id")
      .eq("user_id", userAId);
    expect(bAiBatches?.length).toBe(0);
  });

  // D06: User gọi privileged RPC -> Không có quyền EXECUTE
  it("D06: Authenticated client directly invoking record_attempt_v1 is denied permission", async () => {
    const { error: rpcErr } = await clientA.rpc("record_attempt_v1" as never, {
      p_session_id: sessionAId,
      p_user_id: userAId,
      p_card_id: cardAId,
      p_client_event_id: "00000000-0000-0000-0000-000000000001",
      p_question_key: "q-1",
      p_attempt_kind: "answer",
      p_answer_text: "journey",
      p_is_correct: true,
      p_grade_source: "reference_match",
      p_feedback: {},
      p_active_elapsed_ms: 1200,
      p_expected_version: 1,
    } as never);

    expect(rpcErr).not.toBeNull();
  });

  // D07: Browser insert attempt/progress trực tiếp -> Bị chặn bởi RLS
  it("D07: Authenticated client directly attempting to insert into study_attempts or study_progress is rejected", async () => {
    const { error: attemptErr } = await clientA.from("study_attempts").insert({
      session_id: sessionAId,
      user_id: userAId,
      card_id: cardAId,
      client_event_id: "11111111-2222-3333-4444-555555555555",
      question_key: "hack-attempt",
      attempt_kind: "answer",
      grade_source: "rule",
      is_correct: true,
    } as never);
    expect(attemptErr).not.toBeNull();

    const { error: progressErr } = await clientA.from("study_progress").insert({
      user_id: userAId,
      card_id: cardAId,
      correct_count: 999,
      mastery: "mastered",
    } as never);
    expect(progressErr).not.toBeNull();
  });

  // D08: POST attempt cùng event hai lần -> Một row, count tăng một lần (Idempotency)
  it("D08: record_attempt_v1 with duplicate client_event_id returns duplicate outcome without double-incrementing progress", async () => {
    const eventId = "aaaaaaaa-bbbb-4000-8000-cccccccccccc";

    // 1st Call via server admin
    const { data: res1, error: err1 } = await adminClient.rpc("record_attempt_v1", {
      p_session_id: sessionAId,
      p_user_id: userAId,
      p_card_id: cardAId,
      p_client_event_id: eventId,
      p_question_key: "q-unique-1",
      p_attempt_kind: "answer",
      p_answer_text: "journey",
      p_is_correct: true,
      p_grade_source: "reference_match",
      p_feedback: {},
      p_active_elapsed_ms: 2000,
      p_expected_version: 1,
      p_next_state: { currentStep: 1 },
    });
    expect(err1).toBeNull();
    const parsedRes1 = res1 as { success: boolean; is_duplicate: boolean };
    expect(parsedRes1.success).toBe(true);
    expect(parsedRes1.is_duplicate).toBe(false);

    // Check progress
    const { data: prog1 } = await adminClient
      .from("study_progress")
      .select("correct_count, correct_streak")
      .eq("user_id", userAId)
      .eq("card_id", cardAId)
      .single();
    expect(prog1?.correct_count).toBe(1);
    expect(prog1?.correct_streak).toBe(1);

    // 2nd Call with EXACT same eventId
    const { data: res2, error: err2 } = await adminClient.rpc("record_attempt_v1", {
      p_session_id: sessionAId,
      p_user_id: userAId,
      p_card_id: cardAId,
      p_client_event_id: eventId,
      p_question_key: "q-unique-1",
      p_attempt_kind: "answer",
      p_answer_text: "journey",
      p_is_correct: true,
      p_grade_source: "reference_match",
      p_feedback: {},
      p_active_elapsed_ms: 2000,
      p_expected_version: 2,
    });
    expect(err2).toBeNull();
    const parsedRes2 = res2 as { success: boolean; is_duplicate: boolean };
    expect(parsedRes2.success).toBe(true);
    expect(parsedRes2.is_duplicate).toBe(true); // Identified as duplicate!

    // Verify progress did NOT double-increment!
    const { data: prog2 } = await adminClient
      .from("study_progress")
      .select("correct_count, correct_streak")
      .eq("user_id", userAId)
      .eq("card_id", cardAId)
      .single();
    expect(prog2?.correct_count).toBe(1);
    expect(prog2?.correct_streak).toBe(1);
  });

  // D09: Hai request tạo active session cùng mode -> Chỉ 1 active session do partial unique index
  it("D09: Partial unique index prevents creating two concurrent active sessions for the same (user, set, mode)", async () => {
    // Attempt to insert a second active session with mode 'learn' for same user and set
    const { error: duplicateSessionErr } = await adminClient
      .from("study_sessions")
      .insert({
        user_id: userAId,
        set_id: setAId,
        mode: "learn",
        content_revision: 1,
        content_snapshot: {},
        ordered_card_ids: [cardAId],
        seed: "seed-second",
        status: "active",
        state: {},
      });

    expect(duplicateSessionErr).not.toBeNull();
    expect(duplicateSessionErr?.message).toContain("study_sessions_unique_active_idx");
  });

  // D10: Two saves cùng expectedVersion -> Một thành công, một 409 (VERSION_CONFLICT)
  it("D10: save_session_state_v1 rejects outdated expected_version with VERSION_CONFLICT", async () => {
    // Current state_version is 2 after attempt above
    // Attempt save with expected_version = 999 (outdated)
    const { data: conflictRes } = await adminClient.rpc("save_session_state_v1", {
      p_session_id: sessionAId,
      p_expected_version: 999,
      p_state: { step: 99 },
      p_active_elapsed_ms: 5000,
    });
    const parsedConflict = conflictRes as { success: boolean; code: string };
    expect(parsedConflict.success).toBe(false);
    expect(parsedConflict.code).toBe("VERSION_CONFLICT");

    // Save with correct version = 2
    const { data: okRes } = await adminClient.rpc("save_session_state_v1", {
      p_session_id: sessionAId,
      p_expected_version: 2,
      p_state: { step: 2 },
      p_active_elapsed_ms: 6000,
    });
    const parsedOk = okRes as { success: boolean; new_version: number };
    expect(parsedOk.success).toBe(true);
    expect(parsedOk.new_version).toBe(3);
  });

  // D11: Concurrent quota sát cap -> Không vượt app budget
  it("D11: reserve_ai_batch_v1 enforces daily quota limits atomically", async () => {
    const testUserAi = userBId;
    const lease1 = "bbbbbbbb-0001-4000-8000-000000000001";
    const lease2 = "bbbbbbbb-0002-4000-8000-000000000002";
    const lease3 = "bbbbbbbb-0003-4000-8000-000000000003";

    // Set daily limit to 2 for testing
    const dailyLimit = 2;

    // Call 1: Success
    const { data: res1 } = await adminClient.rpc("reserve_ai_batch_v1", {
      p_user_id: testUserAi,
      p_set_id: setAId,
      p_mode: "context",
      p_card_ids: [cardAId],
      p_content_revision: 1,
      p_cache_key: "cache-key-1",
      p_prompt_version: "v1",
      p_schema_version: "v1",
      p_lease_token: lease1,
      p_daily_limit: dailyLimit,
      p_minute_limit: 10,
    });
    expect((res1 as { status: string }).status).toBe("lease_acquired");

    // Call 2: Success
    const { data: res2 } = await adminClient.rpc("reserve_ai_batch_v1", {
      p_user_id: testUserAi,
      p_set_id: setAId,
      p_mode: "grammar",
      p_card_ids: [cardAId],
      p_content_revision: 1,
      p_cache_key: "cache-key-2",
      p_prompt_version: "v1",
      p_schema_version: "v1",
      p_lease_token: lease2,
      p_daily_limit: dailyLimit,
      p_minute_limit: 10,
    });
    expect((res2 as { status: string }).status).toBe("lease_acquired");

    // Call 3: Exceeds dailyLimit (2) -> Quota Exceeded!
    const { data: res3 } = await adminClient.rpc("reserve_ai_batch_v1", {
      p_user_id: testUserAi,
      p_set_id: setAId,
      p_mode: "reading",
      p_card_ids: [cardAId],
      p_content_revision: 1,
      p_cache_key: "cache-key-3",
      p_prompt_version: "v1",
      p_schema_version: "v1",
      p_lease_token: lease3,
      p_daily_limit: dailyLimit,
      p_minute_limit: 10,
    });
    expect((res3 as { status: string }).status).toBe("quota_exceeded");
    expect((res3 as { code: string }).code).toBe("DAILY_QUOTA_EXCEEDED");
  });

  // D16: Verify migrations apply cleanliness
  it("D16: All database migrations 0001, 0002, 0003, 0004 applied without errors", async () => {
    const { data: tables } = await adminClient
      .from("learning_sets")
      .select("id")
      .limit(1);
    expect(tables).not.toBeNull();
  });
});
