import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import { getUserStats } from "@/features/stats/stats.repository";
import { createOrResumeSession, recordServerAttempt } from "@/features/study/sessions.repository";
import { generateClientEventId } from "@/features/study/study-client-adapter";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("T13 Integration Tests - Stats & Isolation (P8)", () => {
  let adminClient: SupabaseClient<Database>;
  let userAId: string;
  let userBId: string;
  let setAId: string;
  let cardAId: string;

  beforeAll(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

    const emailA = `stats_user_a_${Date.now()}@example.com`;
    const emailB = `stats_user_b_${Date.now()}@example.com`;
    const password = "Password123!Secure";

    const { data: createdA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User A Stats" },
    });
    userAId = createdA!.user!.id;

    const { data: createdB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User B Stats" },
    });
    userBId = createdB!.user!.id;

    // Create a learning set owned by User A with 1 card
    const { data: setA } = await adminClient
      .from("learning_sets")
      .insert({
        owner_id: userAId,
        title: "Stats Test Set",
        cefr_level: "A2",
        topic: "daily",
        is_public: true,
      })
      .select("id")
      .single();
    setAId = setA!.id;

    const { data: cardA } = await adminClient
      .from("vocabulary_cards")
      .insert({
        set_id: setAId,
        term: "resilience",
        meaning_vi: "sự kiên cường",
        part_of_speech: "noun",
        position: 0,
        accepted_answers: ["resilience"],
      })
      .select("id")
      .single();
    cardAId = cardA!.id;
  });

  it("calculates accurate stats for User A and strictly isolates them from User B", async () => {
    // 1. Initial stats for both users should be 0
    const initialStatsA = await getUserStats(userAId, { timezone: "Asia/Ho_Chi_Minh" });
    const initialStatsB = await getUserStats(userBId, { timezone: "Asia/Ho_Chi_Minh" });

    expect(initialStatsA.totalAttempts).toBe(0);
    expect(initialStatsB.totalAttempts).toBe(0);
    expect(initialStatsA.totalActiveSeconds).toBe(0);
    expect(initialStatsB.totalActiveSeconds).toBe(0);

    // 2. User A creates a session and records 2 attempts (1 correct, 1 incorrect)
    const { session: sessionA } = await createOrResumeSession({
      userId: userAId,
      setId: setAId,
      mode: "test",
      action: "restart",
    });

    const eventId1 = generateClientEventId();
    await recordServerAttempt({
      userId: userAId,
      sessionId: sessionA.id,
      cardId: cardAId,
      clientEventId: eventId1,
      questionKey: `test:${cardAId}:1`,
      attemptKind: "answer",
      userAnswer: "resilience", // correct
      activeElapsedMs: 5000,
      expectedVersion: sessionA.state_version,
    });

    const eventId2 = generateClientEventId();
    await recordServerAttempt({
      userId: userAId,
      sessionId: sessionA.id,
      cardId: cardAId,
      clientEventId: eventId2,
      questionKey: `test:${cardAId}:2`,
      attemptKind: "answer",
      userAnswer: "wrong answer", // incorrect
      activeElapsedMs: 3000,
      expectedVersion: sessionA.state_version,
    });

    // 3. User A creates an arcade session with a score
    await adminClient.from("study_sessions").insert({
      user_id: userAId,
      set_id: setAId,
      mode: "arcade_recall",
      content_revision: 1,
      content_snapshot: [],
      ordered_card_ids: [cardAId],
      seed: "42",
      state: { score: 1850, stageIndex: 1 },
      status: "completed",
      state_version: 1,
      active_elapsed_ms: 22000,
    });

    // 4. Query stats for User A
    const statsA = await getUserStats(userAId, { timezone: "Asia/Ho_Chi_Minh" });
    expect(statsA.totalAttempts).toBe(2);
    expect(statsA.correctAttempts).toBe(1);
    expect(statsA.accuracyRate).toBe(50);
    expect(statsA.bestArcadeScore).toBe(1850);
    // Active elapsed ms sum includes sessionA (0) + arcade session (22000ms = 22s)
    expect(statsA.totalActiveSeconds).toBeGreaterThanOrEqual(22);
    expect(statsA.streakDays).toBeGreaterThanOrEqual(1);
    expect(statsA.recentSessions.length).toBeGreaterThanOrEqual(2);

    // 5. Query stats for User B: MUST REMAIN COMPLETELY ISOLATED (0)
    const statsB = await getUserStats(userBId, { timezone: "Asia/Ho_Chi_Minh" });
    expect(statsB.totalAttempts).toBe(0);
    expect(statsB.correctAttempts).toBe(0);
    expect(statsB.accuracyRate).toBe(0);
    expect(statsB.bestArcadeScore).toBe(0);
    expect(statsB.totalActiveSeconds).toBe(0);
    expect(statsB.streakDays).toBe(0);
    expect(statsB.recentSessions).toHaveLength(0);
  });
});
