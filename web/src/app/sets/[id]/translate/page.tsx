"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DEMO_TRANSLATION_EXERCISES } from "@/data/demo/exercises.demo";
import { normalizeAnswerText } from "@/features/study/engine";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function TranslationExerciseContent() {
  const params = useParams();
  const setId = (params?.id as string) || "";

  const [exercises] = useState(DEMO_TRANSLATION_EXERCISES.exercises);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [score, setScore] = useState(0);

  const currentExercise = exercises[currentIndex];

  const handleCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userAnswer.trim() || isEvaluated) return;

    const normalizedUser = normalizeAnswerText(userAnswer);

    // Check exact reference and accepted variations
    const matched = currentExercise.acceptedAnswers.some((ans) => {
      return normalizeAnswerText(ans) === normalizedUser;
    });

    setIsMatched(matched);
    setIsEvaluated(true);
    if (matched) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((i) => i + 1);
      setUserAnswer("");
      setIsEvaluated(false);
      setIsMatched(false);
      setShowHints(false);
    }
  };

  const isComplete = currentIndex === exercises.length - 1 && isEvaluated;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Link
            href={`/sets/${setId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại bộ thẻ
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="teal" size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Luyện dịch Việt → Anh
            </Badge>
            <span className="text-xs font-bold text-zinc-500">
              Câu {currentIndex + 1} / {exercises.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300"
            style={{
              width: `${((currentIndex + (isEvaluated ? 1 : 0)) / exercises.length) * 100}%`,
            }}
          />
        </div>

        {/* Translation Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Dịch câu sau sang tiếng Anh
            </span>
            <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-relaxed">
              &ldquo;{currentExercise.promptVi}&rdquo;
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="translation-input" className="text-xs font-medium text-zinc-500">
                Câu dịch của bạn:
              </label>
              <Input
                id="translation-input"
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                disabled={isEvaluated}
                placeholder="Nhập câu tiếng Anh hoàn chỉnh..."
                className="w-full text-base font-medium"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Evaluation banner */}
            {isEvaluated && (
              <div
                className={`p-4 rounded-xl space-y-2 ${
                  isMatched
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isMatched ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-900 dark:text-emerald-200">
                        Chính xác! Khớp đáp án tham chiếu.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-amber-900 dark:text-amber-200">
                        Chưa khớp đáp án tham chiếu.
                      </span>
                    </>
                  )}
                </div>

                <div className="text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                  <p>
                    <span className="font-semibold">Đáp án tham chiếu: </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {currentExercise.referenceEn}
                    </span>
                  </p>
                  {currentExercise.acceptedAnswers.length > 1 && (
                    <p className="text-[11px] text-zinc-500">
                      Các cách diễn đạt khác được chấp nhận:{" "}
                      {currentExercise.acceptedAnswers
                        .filter((a) => a !== currentExercise.referenceEn)
                        .join(" / ")}
                    </p>
                  )}
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  {currentExercise.explanationVi}
                </p>
              </div>
            )}

            {/* Hints Section */}
            {!isEvaluated && currentExercise.hints && currentExercise.hints.length > 0 && (
              <div>
                {showHints ? (
                  <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-xs space-y-1">
                    <span className="font-bold text-teal-800 dark:text-teal-300">
                      Gợi ý từ vựng:
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentExercise.hints.map((h) => (
                        <span
                          key={h.word}
                          className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                        >
                          <strong>{h.word}</strong>: {h.meaningVi}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHints(true)}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Xem từ gợi ý
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2">
              {!isEvaluated ? (
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  className="w-full"
                  disabled={!userAnswer.trim()}
                >
                  Kiểm tra câu dịch
                </Button>
              ) : isComplete ? (
                <div className="space-y-4 text-center">
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Hoàn thành bài luyện dịch! Điểm: {score}/{exercises.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setCurrentIndex(0);
                        setUserAnswer("");
                        setIsEvaluated(false);
                        setScore(0);
                      }}
                    >
                      Làm lại bài
                    </Button>
                    <Link href={`/sets/${setId}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        Quay về bộ thẻ
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-1"
                >
                  <span>Câu tiếp theo</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

export default function TranslationExercisePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-center text-zinc-500">Đang tải bài luyện dịch...</div>
        </AppShell>
      }
    >
      <TranslationExerciseContent />
    </Suspense>
  );
}
