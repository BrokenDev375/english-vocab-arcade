import "server-only";
import { gradeSpeechTranscript } from "@/features/audio/speech-adapter";
import { GrammarOutputSchema, ReadingOutputSchema, TranslationOutputSchema } from "@/features/ai/schemas";
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

  // 3. Fetch set metadata and verify visibility
  const { data: setRow, error: setError } = await adminClient
    .from("learning_sets")
    .select("id, owner_id, is_public, content_revision")
    .eq("id", setId)
    .maybeSingle();

  if (setError || !setRow) {
    throw new Error("NOT_FOUND: Learning set not found");
  }

  // Enforce visibility: only owner or public sets can have study sessions created
  if (!setRow.is_public && setRow.owner_id !== userId) {
    throw new Error("NOT_FOUND: Learning set not found or private");
  }

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

  // Fetch all cards with pagination loop to support sets > 1,000 cards
  const allCards: Array<{
    id: string;
    term: string;
    meaning_vi: string;
    part_of_speech: string;
    accepted_answers: string[] | null;
    ipa: string | null;
    position: number;
  }> = [];

  let from = 0;
  const CHUNK_SIZE = 1000;
  while (true) {
    const { data: chunk, error: cardsError } = await adminClient
      .from("vocabulary_cards")
      .select("id, term, meaning_vi, part_of_speech, accepted_answers, ipa, position")
      .eq("set_id", setId)
      .order("position", { ascending: true }).order("id", { ascending: true })
      .range(from, from + CHUNK_SIZE - 1);

    if (cardsError) {
      throw new Error("Could not load set cards for session: " + cardsError.message);
    }
    if (!chunk || chunk.length === 0) break;
    const mappedChunk = chunk.map((c) => ({
      id: c.id,
      term: c.term,
      meaning_vi: c.meaning_vi,
      part_of_speech: c.part_of_speech,
      accepted_answers: Array.isArray(c.accepted_answers)
        ? (c.accepted_answers as string[])
        : [c.term],
      ipa: c.ipa,
      position: c.position,
    }));
    allCards.push(...mappedChunk);
    if (chunk.length < CHUNK_SIZE) break;
    from += CHUNK_SIZE;
  }

  if (allCards.length === 0) {
    throw new Error("EMPTY_SET: Không thể tạo phiên học cho bộ từ vựng không có thẻ");
  }

  const orderedCardIds = allCards.map((c) => c.id);
  const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 4. Insert new session
  const { data: newSession, error: insertError } = await adminClient
    .from("study_sessions")
    .insert({
      user_id: userId,
      set_id: setId,
      mode,
      content_revision: setRow.content_revision,
      content_snapshot: allCards as unknown as NonNullable<import("@/types/database.generated").Json>,
      ordered_card_ids: orderedCardIds,
      seed,
      state: { settings, stageIndex: 0 } as unknown as NonNullable<import("@/types/database.generated").Json>,
      status: "active",
      state_version: 1,
      active_elapsed_ms: 0,
    })
    .select("*")
    .single();

  if (insertError?.code === "23505") {
    const { data: concurrent } = await adminClient.from("study_sessions").select("*").eq("user_id", userId).eq("set_id", setId).eq("mode", mode).in("status", ["active", "paused"]).maybeSingle();
    if (concurrent) return { session: concurrent as unknown as SessionRecord, isNew: false };
  }
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
    .select("user_id, set_id, status, mode, content_snapshot, state_version")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== userId) {
    return { success: false, code: "FORBIDDEN", error: "Session access denied" };
  }

  if (session.status === "completed" || session.status === "abandoned") {
    return {
      success: false,
      code: "SESSION_TERMINATED",
      error: "Phiên học đã kết thúc hoặc bị hủy",
    };
  }

  // 2. Validate card membership in session snapshot (R06 fix)
  interface SnapshotCard {
    id: string;
    term: string;
    accepted_answers?: string[] | null;
  }
  const cards = (Array.isArray(session.content_snapshot)
    ? session.content_snapshot
    : (session.content_snapshot as unknown as { cards?: SnapshotCard[] })?.cards || []) as SnapshotCard[];
  const targetCard = cards.find((c) => c.id === cardId);

  if (!targetCard) {
    return {
      success: false,
      code: "INVALID_CARD_MEMBERSHIP",
      error: "Thẻ không thuộc danh sách thẻ của phiên học",
    };
  }

  // 3. Server-side grading against snapshot
  let isCorrect = false;
  let gradeSource = "rule";

  if (attemptKind === "self_rating") {
    isCorrect = userAnswer === "remembered";
    gradeSource = "self_rating";
  } else if (attemptKind === "game_hit") {
    if (session.mode !== "arcade_typing" && session.mode !== "arcade_recall") {
      return {
        success: false,
        code: "INVALID_ATTEMPT_KIND",
        error: "Chỉ chế độ arcade mới chấp nhận game_hit",
      };
    }
    const cleanUser = userAnswer.trim().toLowerCase();
    const matchesTerm = cleanUser === targetCard.term.trim().toLowerCase();
    const matchesAccepted = (targetCard.accepted_answers || []).some(
      (ans) => ans.trim().toLowerCase() === cleanUser
    );
    if (!matchesTerm && !matchesAccepted) {
      return {
        success: false,
        code: "INVALID_ANSWER",
        error: "Đáp án bắn mục tiêu không khớp từ mục tiêu",
      };
    }
    isCorrect = true;
    gradeSource = "rule";
  } else if (attemptKind === "game_miss") {
    if (session.mode !== "arcade_typing" && session.mode !== "arcade_recall") {
      return {
        success: false,
        code: "INVALID_ATTEMPT_KIND",
        error: "Chỉ chế độ arcade mới chấp nhận game_miss",
      };
    }
    isCorrect = false;
    gradeSource = "rule";
  } else if (session.mode === "speak") {
    isCorrect = gradeSpeechTranscript(userAnswer, targetCard.term, targetCard.accepted_answers || []).isMatch;
  } else if (["grammar", "reading", "translate"].includes(session.mode)) {
    const key = /^ai:([0-9a-f-]{36}):(\d+)$/i.exec(questionKey);
    if (!key) return { success: false, code: "INVALID_ANSWER", error: "Thiếu bài tập tham chiếu." };
    const { data: batch } = await adminClient.from("ai_batches").select("output,mode")
      .eq("id", key[1]).eq("user_id", userId).eq("set_id", session.set_id!).eq("status", "ready").maybeSingle();
    if (!batch || batch.mode !== (session.mode === "translate" ? "translation" : session.mode)) return { success: false, code: "INVALID_ANSWER", error: "Bài tập không thuộc phiên học." };
    const index = Number(key[2]);
    if (session.mode === "grammar") {
      const parsed = GrammarOutputSchema.safeParse(batch.output);
      const ex = parsed.success ? parsed.data.exercises[index] : null;
      if (!ex || ex.cardId !== cardId) return { success: false, code: "INVALID_CARD_MEMBERSHIP" };
      isCorrect = [ex.tokens, ...ex.acceptedTokenOrders].some(order => order.join(" ") === userAnswer) || ex.sentenceEn === userAnswer;
    } else if (session.mode === "translate") {
      const parsed = TranslationOutputSchema.safeParse(batch.output);
      const ex = parsed.success ? parsed.data.exercises[index] : null;
      if (!ex || ex.cardId !== cardId) return { success: false, code: "INVALID_CARD_MEMBERSHIP" };
      isCorrect = isAnswerCorrect(userAnswer, ex.referenceEn, ex.acceptedAnswers);
    } else {
      const parsed = ReadingOutputSchema.safeParse(batch.output);
      const question = parsed.success ? parsed.data.questions[index] : null;
      if (!question || !parsed.success || !parsed.data.usedCardIds.includes(cardId)) return { success: false, code: "INVALID_CARD_MEMBERSHIP" };
      isCorrect = userAnswer === String(question.correctIndex);
    }
  } else {
    isCorrect = isAnswerCorrect(
      userAnswer,
      targetCard.term,
      targetCard.accepted_answers || [targetCard.term]
    );
    gradeSource = "rule";
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
