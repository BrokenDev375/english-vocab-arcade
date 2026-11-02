"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  Layers,
  Plus,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetCollection } from "@/components/sets/SetCollection";
import { useStudyIdentity } from "@/components/auth/AuthProvider";
import { STUDY_MODE_LABELS, studyModeHref } from "@/features/study/modes";
import type { UserStatsSummary } from "@/features/stats/stats.types";

export default function DashboardPage() {
  const identity = useStudyIdentity();
  const [stats, setStats] = useState<UserStatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"mine" | "recent">("mine");
  useEffect(() => {
    if (identity.userId === "guest") return;
    const controller = new AbortController();
    void fetch("/api/stats", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Không tải được tiến độ học. Hãy tải lại trang.");
        const json = await response.json();
        if (!controller.signal.aborted) setStats(json.data);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tải được tiến độ.",
          );
      });
    return () => controller.abort();
  }, [identity.userId]);
  const recent = (stats?.recentSessions || []).filter(
    (session, index, all) =>
      session.setId &&
      all.findIndex((item) => item.setId === session.setId) === index,
  );
  return (
    <AppShell>
      <div className="space-y-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Thư viện của tôi
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Học phần, tiến độ và những từ bạn muốn ghi nhớ.
            </p>
          </div>
          <Link
            href="/sets/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
          >
            <Plus className="size-4" />
            Tạo học phần mới
          </Link>
        </div>
        {identity.userId === "guest" ? (
          <div className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-8 text-center dark:border-indigo-900 dark:bg-indigo-950/30">
            <BookOpen className="mx-auto size-10 text-indigo-500" />
            <h2 className="text-xl font-bold">
              Đăng nhập để mở thư viện của bạn
            </h2>
            <p className="text-sm text-zinc-500">
              Lưu bộ thẻ và tiếp tục học trên các thiết bị của bạn.
            </p>
            <Link
              href="/login?next=%2Fdashboard"
              className="inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
            >
              Đăng nhập
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 p-4 text-sm text-rose-600"
              >
                {error}
                <button
                  className="ml-2 underline"
                  onClick={() => window.location.reload()}
                >
                  Thử lại
                </button>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: "Chuỗi học tập",
                  value: stats ? `${stats.streakDays} ngày` : "—",
                  icon: Flame,
                  color: "text-orange-500",
                },
                {
                  label: "Từ vựng đã thuộc",
                  value: stats ? `${stats.totalMasteredWords} từ` : "—",
                  icon: Layers,
                  color: "text-indigo-500",
                },
                {
                  label: "Thời gian học",
                  value: stats
                    ? `${Math.round(stats.totalActiveSeconds / 60)} phút`
                    : "—",
                  icon: Clock,
                  color: "text-blue-500",
                },
                {
                  label: "Kỷ lục Word Blaster",
                  value: stats
                    ? `${stats.bestArcadeScore.toLocaleString()} điểm`
                    : "—",
                  icon: Zap,
                  color: "text-amber-500",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span>{label}</span>
                    <Icon className={`size-4 shrink-0 ${color}`} />
                  </div>
                  <p className="mt-3 text-xl font-black sm:text-2xl">{value}</p>
                </div>
              ))}
            </div>
            <div
              role="tablist"
              aria-label="Thư viện học phần"
              className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800"
            >
              {[
                { id: "mine", label: "Học phần của tôi" },
                { id: "recent", label: "Đã học gần đây" },
              ].map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls="library-panel"
                  onClick={() => setTab(item.id as typeof tab)}
                  className={`border-b-2 py-3 text-sm font-bold ${tab === item.id ? "border-indigo-600 text-indigo-600 dark:text-indigo-300" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <section
              id="library-panel"
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
            >
              {tab === "mine" ? (
                <SetCollection scope="user" />
              ) : (
                <div className="space-y-3">
                  {!stats ? (
                    <p role="status" className="p-6 text-sm text-zinc-500">
                      Đang tải các phiên học...
                    </p>
                  ) : !recent.length ? (
                    <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                      Bạn chưa có phiên học gần đây. Hãy mở một học phần để bắt
                      đầu.
                    </p>
                  ) : (
                    recent.map((session) => (
                      <Link
                        key={session.id}
                        href={studyModeHref(session.setId, session.mode)}
                        className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-bold">
                            {session.setTitle}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {STUDY_MODE_LABELS[session.mode] || "Học"} ·{" "}
                            {session.status === "completed"
                              ? "Đã hoàn thành"
                              : "Tiếp tục học"}
                          </p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-indigo-500" />
                      </Link>
                    ))
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
