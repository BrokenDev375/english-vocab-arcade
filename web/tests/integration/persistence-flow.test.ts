import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";
import {
  createOrResumeSession,
  updateSessionState,
  recordServerAttempt,
  getUserProgressSummary,
} from "@/features/study/sessions.repository";
import {
  buildLocalBackupKey,
  saveLocalSessionBackup,
  getLocalSessionBackup,
  clearUserLocalData,
  generateClientEventId,
} from "@/features/study/study-client-adapter";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("T12 Integration Tests - Persistence & Anti-Duplication (E06, D08-D10)", () => {
  let adminClient: SupabaseClient<Database>;
  let userAId: string;
  let userBId: string;
  let setAId: string;
  let cardAId: string;

  beforeAll(async () => {
    adminClient = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

    const emailA = `persist_a_${Date.now()}@example.com`;
    const emailB = `persist_b_${Date.now()}@example.com`;
    const password = "Password123!Secure";

    const { data: createdA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User A Persist" },
    });
    userAId = createdA!.user!.id;

    const { data: createdB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User B Persist" },
    });
    userBId = createdB!.user!.id;

    // Create a learning set and card for User A
    const { data: setA } = await adminClient
      .from("learning_sets")
      .insert({
        owner_id: userAId,
        title: "Bộ từ persistence test A",
        cefr_level: "A2",
        topic: "daily",
        is_public: false,
      })
      .select("id")
      .single();
    setAId = setA!.id;

    const { data: cardA } = await adminClient
      .from("vocabulary_cards")
      .insert({
        set_id: setAId,
        term: "persistence",
        meaning_vi: "sự kiên trì",
        part_of_speech: "noun",
        accepted_answers: ["persistence", "tenacity"],
        position: 0,
      })
      .select("id")
      .single();
    cardAId = cardA!.id;
  });

  it("D09 & E06: createOrResumeSession enforces 1 active session per (user, set, mode) and resumes existing", async () => {
    // 1. Create session 1
    const res1 = await createOrResumeSession({
      userId: userAId,
      setId: setAId,
      mode: "learn",
      action: "resume_or_create",
    });

    expect(res1.isNew).toBe(true);
    expect(res1.session.state_version).toBe(1);
    expect(res1.session.status).toBe("active");
    expect(res1.session.ordered_card_ids).toContain(cardAId);

    // 2. Resume session: returns existing without creating duplicate active row
    const res2 = await createOrResumeSession({
      userId: userAId,
      setId: setAId,
      mode: "learn",
      action: "resume_or_create",
    });

    expect(res2.isNew).toBe(false);
    expect(res2.session.id).toBe(res1.session.id);
  });

  it("D10: Optimistic locking rejects stale version updates with VERSION_CONFLICT", async () => {
    const { session } = await createOrResumeSession({
      userId: userAId,
      setId: setAId,
      mode: "arcade_typing",
      action: "restart",
    });

    const sessionId = session.id;
    expect(session.state_version).toBe(1);

    // Tab 1 updates with expectedVersion = 1 -> succeeds, version becomes 2
    const update1 = await updateSessionState(
      userAId,
      sessionId,
      1,
      { score: 100, stageIndex: 0 },
      5000,
      "active"
    );
    expect(update1.success).toBe(true);
    expect(update1.new_version).toBe(2);

    // Tab 2 tries to update with stale expectedVersion = 1 -> VERSION_CONFLICT!
    const updateStale = await updateSessionState(
      userAId,
      sessionId,
      1,
      { score: 50, stageIndex: 0 },
      3000,
      "active"
    );
    expect(updateStale.success).toBe(false);
    expect(updateStale.code).toBe("VERSION_CONFLICT");
    expect(updateStale.latest_version).toBe(2);

    // User B cannot update User A's session
    const updateForbidden = await updateSessionState(
      userBId,
      sessionId,
      2,
      { score: 999 },
      1000
    );
    expect(updateForbidden.success).toBe(false);
    expect(updateForbidden.code).toBe("FORBIDDEN");
  });

  it("D08: Server-graded attempt is idempotent by client_event_id and does not double count", async () => {
    const { session } = await createOrResumeSession({
      userId: userAId,
      setId: setAId,
      mode: "test",
      action: "restart",
    });

    const sessionId = session.id;
    const clientEventId = generateClientEventId();

    // 1. Submit first attempt (correct answer from accepted_answers)
    const att1 = await recordServerAttempt({
      userId: userAId,
      sessionId,
      cardId: cardAId,
      clientEventId,
      questionKey: `test:${cardAId}:1`,
      attemptKind: "answer",
      userAnswer: "tenacity", // in accepted_answers!
      activeElapsedMs: 2500,
      expectedVersion: session.state_version,
    });

    expect(att1.success).toBe(true);
    expect(att1.is_correct).toBe(true);
    expect(att1.is_duplicate).toBeFalsy();

    // 2. Retry exact same clientEventId (e.g. network retry)
    const attRetry = await recordServerAttempt({
      userId: userAId,
      sessionId,
      cardId: cardAId,
      clientEventId,
      questionKey: `test:${cardAId}:1`,
      attemptKind: "answer",
      userAnswer: "tenacity",
      activeElapsedMs: 2500,
      expectedVersion: att1.version!,
    });

    expect(attRetry.success).toBe(true);
    expect(attRetry.is_duplicate).toBe(true);

    // 3. Verify in database: exactly 1 attempt row exists for this clientEventId
    const { data: attempts } = await adminClient
      .from("study_attempts")
      .select("id")
      .eq("session_id", sessionId)
      .eq("client_event_id", clientEventId);
    expect(attempts).toHaveLength(1);

    // 4. Verify progress summary
    const summary = await getUserProgressSummary(userAId, setAId);
    expect(summary.totalStudied).toBeGreaterThanOrEqual(1);
    const cardProgress = summary.items.find((p) => p.card_id === cardAId);
    expect(cardProgress?.correct_streak).toBe(1);
    expect(cardProgress?.correct_count).toBe(1);
  });

  it("Local backup key scoping and user data cleanup on logout", () => {
    const keyA = buildLocalBackupKey("user_a", "set_1", "learn", "sess_1");
    const keyGuest = buildLocalBackupKey("guest", "set_1", "learn", "sess_2");

    expect(keyA).toBe("eva:v1:user_a:set_1:learn:sess_1");
    expect(keyGuest).toBe("eva:v1:guest:set_1:learn:sess_2");

    // In a browser/mock environment, save and get local backup
    if (typeof window !== "undefined") {
      saveLocalSessionBackup({
        schemaVersion: 1,
        sessionId: "sess_1",
        userIdOrGuest: "user_a",
        setId: "set_1",
        mode: "learn",
        baseServerVersion: 1,
        savedAt: new Date().toISOString(),
        state: { stageIndex: 0 },
        pendingAttempts: [],
      });

      const restored = getLocalSessionBackup("user_a", "set_1", "learn", "sess_1");
      expect(restored?.sessionId).toBe("sess_1");

      // Logout clears user_a data but preserves other users
      clearUserLocalData("user_a");
      const afterClear = getLocalSessionBackup("user_a", "set_1", "learn", "sess_1");
      expect(afterClear).toBeNull();
    }
  });
});
