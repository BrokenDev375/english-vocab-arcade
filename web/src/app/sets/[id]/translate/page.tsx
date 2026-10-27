"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DEMO_TRANSLATION_EXERCISES } from "@/data/demo/exercises.demo";
import { normalizeAnswerText } from "@/features/study/engine";
import { fetchAllSetCards } from "@/features/sets/sets-client";
import { recordLocalAttempt, generateClientEventId } from "@/features/study/study-client-adapter";
import type { TranslationOutput } from "@/features/ai/schemas";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";

function TranslationExerciseContent() {
  const params = useParams();
  const setId = (params?.id as string) || "";

  const [exercises, setExercises] = useState(DEMO_TRANSLATION_EXERCISES.exercises);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionId] = useState(() => `session_trans_${Date.now()}`);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (setId.startsWith("d000")) {
        setExercises(DEMO_TRANSLATION_EXERCISES.exercises);
        setLoading(false);
        return;
      }

      try {
        const [setRes, cards] = await Promise.all([
          fetch(`/api/sets/${setId}`),
          fetchAllSetCards(setId),
        ]);

        if (ignore) return;

        if (!setRes.ok) {
          if (setRes.status === 404) {
            setError("Không tìm thấy bộ từ vựng hoặc bộ từ vựng là riêng tư");
          } else {
            setError("Lỗi khi tải thông tin bộ từ vựng");
          }
          return;
        }

        if (cards.length === 0) {
          setError("Bộ từ vựng này chưa có thẻ từ vựng nào để luyện dịch câu");
          return;
        }

        // Request AI batch
        try {
          const batchRes = await fetch("/api/ai/batches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              setId,
              mode: "translation",
              cardIds: cards.slice(0, 5).map((c) => c.id),
            }),
          });

          if (batchRes.ok) {
            const batchJson = await batchRes.json();
            const output = batchJson.data?.output as TranslationOutput | undefined;
            if (output && output.exercises && output.exercises.length > 0) {
              setExercises(output.exercises);
              setLoading(false);
              return;
            }
          }
          setAiNotice("Tính năng dịch AI tạm thời chưa hoàn tất cho bộ này. Hiển thị bài tập tham khảo mẫu.");
          setExercises(DEMO_TRANSLATION_EXERCISES.exercises);
        } catch {
          setAiNotice("Không thể kết nối dịch vụ AI. Hiển thị bài tập tham khảo mẫu.");
          setExercises(DEMO_TRANSLATION_EXERCISES.exercises);
        }
      } catch (err) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : "Lỗi tải học phần";
        setError(msg);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (setId) {
      void loadData();
    }

    return () => {
      ignore = true;
    };
  }, [setId]);

  const currentExercise = exercises[currentIndex];

  const handleCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userAnswer.trim() || isEvaluated || !currentExercise) return;

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

    recordLocalAttempt({
      clientEventId: generateClientEventId(),
      sessionId,
      setId,
      cardId: currentExercise.cardId,
      mode: "learn",
      questionType: "type_in",
      userAnswer,
      isCorrect: matched,
      durationMs: 4000,
      answeredAt: new Date().toISOString(),
    });
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

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Đang chuẩn bị bài tập dịch câu thông minh..." />
      </AppShell>
    );
  }

  if (error || !currentExercise) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-4">
          <ErrorAlert message={error || "Không có bài tập dịch cho bộ từ vựng này"} />
          <Link href={`/sets/${setId}`} className="inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại học phần
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

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

        {aiNotice && (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs rounded-xl">
            <Info className="w-4 h-4 shrink-0" />
            <span>{aiNotice}</span>
          </div>
        )}

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
