"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

import {
  Compass,
  Search,
  ArrowRight,
  Gamepad2,
} from "lucide-react";

interface SetItem {
  id: string;
  title: string;
  description: string;
  cefrLevel: string;
  topic: string;
  cardCount: number;
  isDemo?: boolean;
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [realSets, setRealSets] = useState<SetItem[]>([]);

  React.useEffect(() => {
    async function loadSets() {
      try {
        const res = await fetch("/api/sets?scope=explore&pageSize=50");
        if (!res.ok) throw new Error("Không tải được danh sách học phần.");
        if (res.ok) {
          const json = await res.json();
          interface ExploreApiRow {
            id: string;
            title: string;
            description?: string | null;
            cefr_level?: string | null;
            topic?: string | null;
            card_count?: number;
          }
          const items: SetItem[] = (json.data || []).map((s: ExploreApiRow) => ({
            id: s.id,
            title: s.title,
            description: s.description || "",
            cefrLevel: s.cefr_level || "A1",
            topic: s.topic || "general",
            cardCount: s.card_count || 0,
            isDemo: false,
          }));
          setRealSets(items);
        }
      } catch { setLoadError("Không tải được danh sách học phần. Vui lòng thử lại."); }
    }
    loadSets();
  }, []);

  const allAvailableSets = realSets;

  const filteredSets = useMemo(() => {
    return allAvailableSets.filter((set) => {
      const matchSearch =
        set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (set.description &&
          set.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchLevel =
        selectedLevel === "ALL" || set.cefrLevel === selectedLevel;

      return matchSearch && matchLevel;
    });
  }, [allAvailableSets, searchQuery, selectedLevel]);

  const levelOptions = [
    { id: "ALL", label: "Tất cả trình độ" },
    { id: "A1", label: "A1 — Cơ bản" },
    { id: "A2", label: "A2 — Sơ cấp" },
    { id: "B1", label: "B1 — Trung cấp" },
    { id: "mixed", label: "Hỗn hợp" },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Cộng đồng học tập
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
            Khám phá các bộ từ vựng
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base mt-1.5 max-w-2xl">
            Lựa chọn học phần chuẩn hóa theo khung A1–B1 để luyện flashcard, ghép cặp hoặc chinh phục thử thách Word Blaster.
          </p>
        </div>

        {loadError && <p role="alert">{loadError} <button onClick={() => window.location.reload()}>Thử lại</button></p>}
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo chủ đề, tiêu đề bộ từ vựng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {levelOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedLevel(opt.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedLevel === opt.id
                    ? "bg-teal-600 text-white dark:bg-teal-500 dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Set Cards Grid */}
        {filteredSets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSets.map((set) => (
              <Card
                key={set.id}
                hoverable
                className="flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="teal" size="sm">
                      {set.cefrLevel.toUpperCase()}
                    </Badge>
                    <Badge variant="zinc" size="sm">
                      {set.cardCount} thẻ
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {set.title}
                  </h3>

                  {set.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {set.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                      {set.topic}
                    </span>
                    <span>•</span>
                    <span>Tiếng Anh chuẩn</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/sets/${set.id}/arcade`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700"
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Chơi Arcade</span>
                  </Link>

                  <Link href={`/sets/${set.id}`}>
                    <Button variant="outline" size="sm">
                      <span>Vào học</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy bộ từ vựng"
            description={`Không có kết quả nào khớp với "${searchQuery}". Hãy thử tìm kiếm bằng từ khóa khác hoặc bỏ bộ lọc.`}
            actionLabel="Đặt lại bộ lọc"
            onAction={() => {
              setSearchQuery("");
              setSelectedLevel("ALL");
            }}
          />
        )}
      </div>
    </AppShell>
  );
}
