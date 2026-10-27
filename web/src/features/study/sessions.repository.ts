import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { isAnswerCorrect } from "./answer-normalization";

export type SessionMode =
  | "flashcard"
  | "learn"
  | "test"
  | "match"
  | "arcade_typing"
  | "arcade_recall"
  | "dictation"
  | "speak"
  | "grammar"
  | "reading"
  | "translate";

export type SessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface CreateSessionParams {
  userId: string;
  setId: string;
  mode: SessionMode;
  action?: "resume_or_create" | "restart";
  settings?: Record<string, unknown>;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  set_id: string | null;
  mode: SessionMode;
  content_revision: number;
  content_snapshot: unknown[];
  ordered_card_ids: string[];
  seed: string;
  state: Record<string, unknown>;
  status: SessionStatus;
  state_version: number;
  active_elapsed_ms: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Creates or resumes an active session for the user and learning set.
 */
export async function createOrResumeSession(
  params: CreateSessionParams
): Promise<{ session: SessionRecord; isNew: boolean }> {
  const { userId, setId, mode, action = "resume_or_create", settings = {} } = params;
  const adminClient = getSupabaseAdminClient();

  // 1. If action is resume_or_create, check for existing active or paused session
  if (action === "resume_or_create") {
    const { data: existing } = await adminClient
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("set_id", setId)
      .eq("mode", mode)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (existing) {
      return { session: existing as unknown as SessionRecord, isNew: false };
    }
  }

  // 2. If restart, mark any existing active/paused session as abandoned first
  if (action === "restart") {
    await adminClient
      .from("study_sessions")
      .update({ status: "abandoned", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("set_id", setId)
      .eq("mode", mode)
      .in("status", ["active", "paused"]);
  }

  // 3. Fetch set metadata and cards to build session snapshot
  const { data: setRow, error: setError } = await adminClient
    .from("learning_sets")
    .select("id, content_revision")
    .eq("id", setId)
    .single();

  if (setError || !setRow) {
    throw new Error("Learning set not found");
  }

  const { data: cardsRows, error: cardsError } = await adminClient
    .from("vocabulary_cards")
    .select("id, term, meaning_vi, part_of_speech, accepted_answers, ipa, position")
    .eq("set_id", setId)
    .order("position", { ascending: true });

  if (cardsError || !cardsRows) {
    throw new Error("Could not load set cards for session");
  }

  const orderedCardIds = cardsRows.map((c) => c.id);
  const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 4. Insert new session
  const { data: newSession, error: insertError } = await adminClient
    .from("study_sessions")
    .insert({
      user_id: userId,
      set_id: setId,
      mode,
      content_revision: setRow.content_revision,
      content_snapshot: cardsRows as unknown as NonNullable<import("@/types/database.generated").Json>,
      ordered_card_ids: orderedCardIds,
      seed,
      state: { settings, stageIndex: 0 } as unknown as NonNullable<import("@/types/database.generated").Json>,
      status: "active",
      state_version: 1,
      active_elapsed_ms: 0,
    })
    .select("*")
    .single();

  if (insertError || !newSession) {
    throw new Error(insertError?.message || "Failed to create study session");
  }

  return { session: newSession as unknown as SessionRecord, isNew: true };
}

/**
 * Gets a session by ID, ensuring ownership.
 */
export async function getSessionById(
  userId: string,
  sessionId: string
): Promise<SessionRecord | null> {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("study_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as SessionRecord;
}

/**
 * Updates session state with optimistic concurrency check using save_session_state_v1 RPC.
 */
export async function updateSessionState(
  userId: string,
  sessionId: string,
  expectedVersion: number,
  state: Record<string, unknown>,
  activeElapsedMs: number,
  status?: SessionStatus
): Promise<{
  success: boolean;
  code?: string;
  error?: string;
  new_version?: number;
  latest_version?: number;
  current_state?: unknown;
}> {
  const adminClient = getSupabaseAdminClient();

  // Verify ownership before running privileged RPC
  const { data: session } = await adminClient
    .from("study_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== userId) {
    return { success: false, code: "FORBIDDEN", error: "Permission denied" };
  }

  const { data, error } = await adminClient.rpc("save_session_state_v1", {
    p_session_id: sessionId,
    p_expected_version: expectedVersion,
    p_state: state as unknown as import("@/types/database.generated").Json,
    p_active_elapsed_ms: activeElapsedMs,
    p_status: status ?? undefined,
  });

  if (error) {
    return { success: false, code: "RPC_ERROR", error: error.message };
  }

  return data as {
    success: boolean;
    code?: string;
    error?: string;
    new_version?: number;
    latest_version?: number;
    current_state?: unknown;
  };
}

export interface RecordAttemptParams {
  userId: string;
  sessionId: string;
  cardId: string;
  clientEventId: string;
  questionKey: string;
  attemptKind: "answer" | "self_rating" | "game_hit" | "game_miss";
  userAnswer: string;
  activeElapsedMs: number;
  expectedVersion: number;
}

/**
 * Server-graded attempt recorder using atomic record_attempt_v1 RPC.
 * Validates correctness server-side from session snapshot.
 */
export async function recordServerAttempt(params: RecordAttemptParams): Promise<{
  success: boolean;
  code?: string;
  error?: string;
  is_duplicate?: boolean;
  version?: number;
  is_correct?: boolean;
}> {
  const {
    userId,
    sessionId,
    cardId,
    clientEventId,
    questionKey,
    attemptKind,
    userAnswer,
    activeElapsedMs,
    expectedVersion,
  } = params;

  const adminClient = getSupabaseAdminClient();

  // 1. Fetch session snapshot to grade server-side
  const { data: session } = await adminClient
    .from("study_sessions")
    .select("user_id, content_snapshot, state_version")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== userId) {
    return { success: false, code: "FORBIDDEN", error: "Session access denied" };
  }

  // 2. Server-side grading against snapshot
  let isCorrect = false;
  let gradeSource = "rule";

  if (attemptKind === "self_rating") {
    isCorrect = userAnswer === "remembered";
    gradeSource = "self_rating";
  } else if (attemptKind === "game_hit") {
    isCorrect = true;
    gradeSource = "rule";
  } else if (attemptKind === "game_miss") {
    isCorrect = false;
    gradeSource = "rule";
  } else {
    // Normal answer grading against snapshot card accepted answers
    interface SnapshotCard {
      id: string;
      term: string;
      accepted_answers?: string[];
    }
    const cards = (session.content_snapshot || []) as unknown as SnapshotCard[];
    const targetCard = cards.find((c) => c.id === cardId);

    if (targetCard) {
      isCorrect = isAnswerCorrect(
        userAnswer,
        targetCard.term,
        targetCard.accepted_answers || [targetCard.term]
      );
      gradeSource = "rule";
    }
  }

  // 3. Call record_attempt_v1 RPC
  const { data, error } = await adminClient.rpc("record_attempt_v1", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_card_id: cardId,
    p_client_event_id: clientEventId,
    p_question_key: questionKey,
    p_attempt_kind: attemptKind,
    p_answer_text: userAnswer,
    p_is_correct: isCorrect,
    p_grade_source: gradeSource,
    p_feedback: { gradedBy: "server_v1" },
    p_active_elapsed_ms: Math.min(600000, Math.max(0, activeElapsedMs)),
    p_expected_version: expectedVersion ?? session.state_version,
  });

  if (error) {
    return { success: false, code: "RPC_ERROR", error: error.message };
  }

  const result = data as {
    success: boolean;
    code?: string;
    error?: string;
    is_duplicate?: boolean;
    version?: number;
    new_version?: number;
  };

  return {
    ...result,
    version: result.new_version ?? result.version ?? session.state_version,
    is_correct: isCorrect,
  };
}

/**
 * Gets progress summary and due cards for the authenticated user.
 */
export async function getUserProgressSummary(userId: string, setId?: string) {
  const adminClient = getSupabaseAdminClient();

  let query = adminClient
    .from("study_progress")
    .select(
      "card_id, correct_count, incorrect_count, correct_streak, mastery, due_at, last_reviewed_at"
    )
    .eq("user_id", userId);

  if (setId) {
    // Find all card IDs in the set
    const { data: setCards } = await adminClient
      .from("vocabulary_cards")
      .select("id")
      .eq("set_id", setId);

    const cardIds = (setCards || []).map((c) => c.id);
    if (cardIds.length > 0) {
      query = query.in("card_id", cardIds);
    } else {
      return { totalStudied: 0, dueCount: 0, items: [] };
    }
  }

  const { data, error } = await query;
  if (error || !data) {
    return { totalStudied: 0, dueCount: 0, items: [] };
  }

  const now = new Date();
  const dueItems = data.filter((p) => new Date(p.due_at) <= now);

  return {
    totalStudied: data.length,
    dueCount: dueItems.length,
    items: data,
  };
}
