"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Trophy,
  RotateCcw,
  AlertCircle,
  ArrowRight,
  Gamepad2,
  BookOpen,
  Info,
} from "lucide-react";
import type { StudyCard } from "@/features/study/question-engine";

interface StudyResultsProps {
  setId: string;
  totalQuestions: number;
  correctCount: number;
  failedCards: StudyCard[];
  onStartErrorReview?: () => void;
  onRestart: () => void;
  modeName: string;
}

export function StudyResults({
  setId,
  totalQuestions,
  correctCount,
  failedCards,
  onStartErrorReview,
  onRestart,
  modeName,
}: StudyResultsProps) {
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const isExcellent = accuracy >= 80;

  return (
    <div className="max-w-xl mx-auto space-y-6 text-center animate-in zoom-in-95 duration-300">
      {/* Trophy Card */}
      <Card className="p-8 space-y-6 border-2 border-teal-500/30 bg-gradient-to-b from-teal-50/30 via-white to-zinc-50 dark:from-teal-950/20 dark:via-zinc-900 dark:to-zinc-900 rounded-3xl shadow-xl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-zinc-50">
            {isExcellent ? "Hoàn thành xuất sắc!" : "Đã hoàn thành phiên học!"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            Chế độ: <strong className="text-zinc-800 dark:text-zinc-200">{modeName}</strong>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60">
            <p className="text-xs text-zinc-500">Độ chính xác</p>
            <p className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">
              {accuracy}%
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60">
            <p className="text-xs text-zinc-500">Trả lời đúng</p>
            <p className="text-3xl font-black text-zinc-950 dark:text-zinc-50 mt-1">
              {correctCount} / {totalQuestions}
            </p>
          </div>
        </div>

        {/* Error Review Callout if there are failed cards */}
        {failedCards.length > 0 && onStartErrorReview && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-left space-y-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Bạn có {failedCards.length} từ vựng cần ôn lại</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Hãy luyện tập lại ngay để tăng cường khả năng ghi nhớ dài hạn theo chu kỳ Spaced Repetition.
            </p>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={onStartErrorReview}
              className="w-full"
            >
              <span>Bắt đầu ôn {failedCards.length} từ sai ngay</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onRestart}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Luyện tập lại
          </Button>

          <Link href={`/sets/${setId}/arcade`} className="w-full">
            <Button variant="amber" size="md" className="w-full">
              <Gamepad2 className="w-4 h-4 mr-1.5" />
              Chơi Word Blaster
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
          <Info className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
          <span>Tiến độ đã được ghi nhận cục bộ (localStorage). Đồng bộ máy chủ đám mây sẽ khả dụng sau khi hoàn tất kết nối T12.</span>
        </div>

        <div>
          <Link
            href={`/sets/${setId}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Quay lại trang học phần</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
