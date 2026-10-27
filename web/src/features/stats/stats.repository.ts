import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { formatLocalDate, calculateStreak } from "./streak";
import type { UserStatsSummary, RecentSessionItem, DailyActivityPoint } from "./stats.types";

export interface GetStatsOptions {
  timezone?: string;
}

/**
 * Server-only repository for user statistics and learning history.
 * Strictly scopes all queries by user_id.
 */
export async function getUserStats(
  userId: string,
  options: GetStatsOptions = {}
): Promise<UserStatsSummary> {
  const timezone = options.timezone || "Asia/Ho_Chi_Minh";
  const adminClient = getSupabaseAdminClient();

  // 1. Fetch sessions for user
  const { data: sessions, error: sessionsError } = await adminClient
    .from("study_sessions")
    .select("id, set_id, mode, status, active_elapsed_ms, state, updated_at, started_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (sessionsError) {
    throw new Error(`Failed to fetch user study sessions: ${sessionsError.message}`);
  }

  // 2. Fetch attempts for user
  const { data: attempts, error: attemptsError } = await adminClient
    .from("study_attempts")
    .select("is_correct, active_elapsed_ms, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (attemptsError) {
    throw new Error(`Failed to fetch user study attempts: ${attemptsError.message}`);
  }

  // 3. Fetch progress rows for user
  const { data: progress, error: progressError } = await adminClient
    .from("study_progress")
    .select("mastery, due_at")
    .eq("user_id", userId);

  if (progressError) {
    throw new Error(`Failed to fetch user study progress: ${progressError.message}`);
  }

  // Set titles map for recent sessions
  const setIds = Array.from(
    new Set((sessions || []).map((s) => s.set_id).filter((id): id is string => Boolean(id)))
  );
  const setTitleMap = new Map<string, string>();
  if (setIds.length > 0) {
    const { data: sets } = await adminClient
      .from("learning_sets")
      .select("id, title")
      .in("id", setIds);
    for (const set of sets || []) {
      setTitleMap.set(set.id, set.title);
    }
  }

  // Aggregate active elapsed seconds (excluding pause/offline)
  const totalActiveMs = (sessions || []).reduce(
    (sum, s) => sum + (Number(s.active_elapsed_ms) || 0),
    0
  );
  const totalActiveSeconds = Math.round(totalActiveMs / 1000);

  // Best arcade score
  let bestArcadeScore = 0;
  for (const s of sessions || []) {
    if (s.mode.startsWith("arcade") && s.state && typeof s.state === "object") {
      const stateObj = s.state as Record<string, unknown>;
      const score = Number(stateObj.score);
      if (!isNaN(score) && score > bestArcadeScore) {
        bestArcadeScore = score;
      }
    }
  }

  // Recent session items
  const recentSessions: RecentSessionItem[] = (sessions || []).slice(0, 10).map((s) => ({
    id: s.id,
    setId: s.set_id || "",
    setTitle: (s.set_id && setTitleMap.get(s.set_id)) || "Bộ từ vựng",
    mode: s.mode,
    status: s.status as "active" | "completed" | "abandoned",
    activeElapsedMs: s.active_elapsed_ms,
    updatedAt: s.updated_at,
  }));

  // Attempts & accuracy metrics
  const totalAttempts = (attempts || []).length;
  const correctAttempts = (attempts || []).filter((a) => a.is_correct).length;
  const accuracyRate =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // Streak calculation
  const allActivityTimestamps = [
    ...(attempts || []).map((a) => a.created_at),
    ...(sessions || []).map((s) => s.updated_at),
  ];
  const streakDays = calculateStreak(allActivityTimestamps, timezone);

  // Word mastery counts
  const nowIso = new Date().toISOString();
  let totalMasteredWords = 0;
  let totalLearningWords = 0;
  let totalDueWords = 0;

  for (const p of progress || []) {
    if (p.mastery === "mastered") {
      totalMasteredWords += 1;
    } else {
      totalLearningWords += 1;
    }
    if (p.due_at && p.due_at <= nowIso) {
      totalDueWords += 1;
    }
  }

  // Daily activity map for the last 14 days
  const dailyActivityMap = new Map<string, { attemptsCount: number; activeMinutes: number }>();
  for (const a of attempts || []) {
    const day = formatLocalDate(a.created_at, timezone);
    if (!day) continue;
    const existing = dailyActivityMap.get(day) || { attemptsCount: 0, activeMinutes: 0 };
    existing.attemptsCount += 1;
    existing.activeMinutes += (Number(a.active_elapsed_ms) || 0) / 60000;
    dailyActivityMap.set(day, existing);
  }

  const dailyActivity: DailyActivityPoint[] = Array.from(dailyActivityMap.entries())
    .map(([date, data]) => ({
      date,
      attemptsCount: data.attemptsCount,
      activeMinutes: Math.round(data.activeMinutes * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    streakDays,
    totalMasteredWords,
    totalLearningWords,
    totalDueWords,
    totalActiveSeconds,
    totalAttempts,
    correctAttempts,
    accuracyRate,
    bestArcadeScore,
    recentSessions,
    dailyActivity,
  };
}
