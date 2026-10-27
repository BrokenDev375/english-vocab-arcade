export interface DailyActivityPoint {
  date: string; // YYYY-MM-DD in user's timezone
  attemptsCount: number;
  activeMinutes: number;
}

export interface RecentSessionItem {
  id: string;
  setId: string;
  setTitle: string;
  mode: string;
  status: "active" | "completed" | "abandoned";
  activeElapsedMs: number;
  updatedAt: string;
}

export interface UserStatsSummary {
  streakDays: number;
  totalMasteredWords: number;
  totalLearningWords: number;
  totalDueWords: number;
  totalActiveSeconds: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number; // 0-100
  bestArcadeScore: number;
  recentSessions: RecentSessionItem[];
  dailyActivity: DailyActivityPoint[];
}
