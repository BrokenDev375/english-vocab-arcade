"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

import type { UserStatsSummary } from "@/features/stats/stats.types";
import {
  LayoutDashboard,
  Flame,
  BookOpen,
  Clock,
  Plus,
  Gamepad2,
  Calendar,
  CheckCircle2,
  PlayCircle,
} from "lucide-react";

export default function DashboardPage() {
  const [sets, setSets] = useState<Array<{ id: string; title: string; cefrLevel: string; cardCount: number }>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStatsSummary | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setStats(json.data);
            setIsAuthenticated(true);
            const setResponse = await fetch("/api/sets?scope=user&pageSize=50");
            if (!setResponse.ok) throw new Error("Không tải được học phần của bạn.");
            const setJson = await setResponse.json();
            if (isMounted) setSets(setJson.data.map((row: { id: string; title: string; cefr_level: string; card_count: number }) => ({ id: row.id, title: row.title, cefrLevel: row.cefr_level, cardCount: row.card_count })));
          }
        } else {
          // Guest or unauthenticated
          if (isMounted) {
            setIsAuthenticated(false);
          }
        }
      } catch {
        if (isMounted) setLoadError("Chưa tải được dữ liệu. Hãy thử tải lại trang.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format active minutes
  const activeMinutes = stats
    ? Math.round(stats.totalActiveSeconds / 60)
    : 0;

  return (
    <AppShell>
      <div className="space-y-8">
        {loadError && <p role="alert">{loadError} <button onClick={() => window.location.reload()}>Thử lại</button></p>}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Không gian học tập cá nhân
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
              Bảng điều khiển
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Theo dõi tiến độ tích lũy từ vựng, duy trì chuỗi học và các phiên chơi Word Blaster.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/sets/new">
              <Button variant="primary" size="md">
                <Plus className="w-4 h-4 mr-1.5" />
                Tạo bộ thẻ mới
              </Button>
            </Link>
          </div>
        </div>

        {/* Guest Banner if not logged in */}
        {!isLoading && !isAuthenticated && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Đăng nhập để xem tiến độ của bạn
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Đăng nhập hoặc đăng ký tài khoản để lưu trữ chuỗi học tập, độ chính xác và lịch sử phiên học của riêng bạn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">Đăng nhập</Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">Đăng ký ngay</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Chuỗi học tập</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-zinc-50">
              {stats ? stats.streakDays : 0}{" "}
              <span className="text-sm font-normal text-zinc-400">ngày</span>
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {stats && stats.streakDays > 0 ? "Đang duy trì chuỗi" : "Bắt đầu bài học hôm nay"}
            </p>
          </Card>

          <Card className="space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Từ vựng đã thuộc</span>
              <BookOpen className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-zinc-50">
              {stats ? stats.totalMasteredWords : 0}{" "}
              <span className="text-sm font-normal text-zinc-400">từ</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              {stats ? `${stats.totalLearningWords} từ đang học` : "Chưa có dữ liệu"}
            </p>
          </Card>

          <Card className="space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Kỷ lục Word Blaster</span>
              <Gamepad2 className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-500">
              {stats && stats.bestArcadeScore > 0 ? stats.bestArcadeScore.toLocaleString() : "0"}{" "}
              <span className="text-sm font-normal text-zinc-400">điểm</span>
            </p>
            <p className="text-[11px] text-zinc-500">
              {stats ? `Độ chính xác ${stats.accuracyRate}%` : "Chưa có thống kê"}
            </p>
          </Card>

          <Card className="space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
              <span>Thời lượng học tập</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-zinc-50">
              {activeMinutes}{" "}
              <span className="text-sm font-normal text-zinc-400">phút</span>
            </p>
            <p className="text-[11px] text-zinc-500">Loại trừ thời gian pause</p>
          </Card>
        </div>

        {/* In Progress Study Sets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Bộ từ vựng đang học
            </h2>
            <Link
              href="/explore"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Thêm bộ khác
            </Link>
          </div>

          {!sets.length && <p>Chưa có học phần của bạn. Hãy tạo bộ thẻ hoặc khám phá học phần công khai.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sets.map((set) => (
              <Card key={set.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="teal" size="sm">
                        {set.cefrLevel}
                      </Badge>
                      <span className="text-xs text-zinc-500 font-medium">
                        {set.cardCount} thẻ
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                      {set.title}
                    </h3>
                  </div>

                  <Link href={`/sets/${set.id}/arcade`}>
                    <Button variant="amber" size="sm">
                      <Gamepad2 className="w-4 h-4 mr-1" />
                      Chơi
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link href={`/sets/${set.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <BookOpen className="w-4 h-4 mr-1" />
                      Luyện tập
                    </Button>
                  </Link>
                  <Link href={`/sets/${set.id}/match`} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full">
                      Ghép cặp
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Study Sessions History (if user has sessions) */}
        {stats && stats.recentSessions && stats.recentSessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Lịch sử phiên học gần đây
            </h2>
            <div className="space-y-2">
              {stats.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      {session.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-teal-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {session.setTitle}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        <span className="capitalize">{session.mode}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.round(session.activeElapsedMs / 1000)}s hoạt động
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      variant={session.status === "completed" ? "teal" : "zinc"}
                      size="sm"
                    >
                      {session.status === "completed" ? "Hoàn thành" : "Đang học"}
                    </Badge>
                    <p className="text-[11px] text-zinc-400 mt-1 flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(session.updatedAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
