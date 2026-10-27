"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DEMO_READING_EXERCISE } from "@/data/demo/exercises.demo";
import {
  ArrowLeft,
  BookOpen,
  Languages,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";

function ReadingExerciseContent() {
  const params = useParams();
  const setId = (params?.id as string) || "";

  const [exercise] = useState(DEMO_READING_EXERCISE);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const allAnswered =
    exercise.questions.length > 0 &&
    exercise.questions.every((q) => selectedAnswers[q.id] !== undefined);

  const calculateScore = () => {
    return exercise.questions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);
  };

  const score = isSubmitted ? calculateScore() : 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
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
              Đọc hiểu CEFR {exercise.level}
            </Badge>
          </div>
        </div>

        {/* Reading Passage Card */}
        <Card className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Bài đọc hiểu theo ngữ cảnh
              </span>
              <h1 className="text-2xl font-black text-zinc-950 dark:text-zinc-50 mt-1">
                {exercise.title}
              </h1>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTranslation((s) => !s)}
              className="self-start sm:self-auto"
            >
              <Languages className="w-4 h-4 mr-1.5" />
              {showTranslation ? "Ẩn bản dịch" : "Xem bản dịch tiếng Việt"}
            </Button>
          </div>

          {/* English Passage Text */}
          <div className="prose dark:prose-invert max-w-none text-base leading-relaxed text-zinc-800 dark:text-zinc-200 font-serif">
            <p>{exercise.passageEn}</p>
          </div>

          {/* Vietnamese Translation Accordion */}
          {showTranslation && (
            <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <p className="font-semibold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-1">
                Bản dịch tham khảo
              </p>
              <p>{exercise.translationVi}</p>
            </div>
          )}
        </Card>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              <span>Câu hỏi đọc hiểu ({exercise.questions.length} câu)</span>
            </h2>
            {isSubmitted && (
              <Badge
                variant={score === exercise.questions.length ? "teal" : "amber"}
                size="md"
              >
                Kết quả: {score} / {exercise.questions.length} đúng
              </Badge>
            )}
          </div>

          {exercise.questions.map((q, qIdx) => {
            const userAnswer = selectedAnswers[q.id];

            return (
              <Card key={q.id} className="p-5 space-y-4">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                    {qIdx + 1}
                  </span>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {q.questionEn}
                  </p>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-2 pl-8">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    const isCorrectOption = optIdx === q.correctIndex;

                    let optionStyle =
                      "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300";

                    if (isSubmitted) {
                      if (isCorrectOption) {
                        optionStyle =
                          "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-semibold";
                      } else if (isSelected && !isCorrectOption) {
                        optionStyle =
                          "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100";
                      }
                    } else if (isSelected) {
                      optionStyle =
                        "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 text-teal-900 dark:text-teal-100 font-medium";
                    }

                    return (
                      <button
                        key={`${q.id}-${optIdx}`}
                        type="button"
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        disabled={isSubmitted}
                        className={`p-3 rounded-xl border text-left text-sm transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full border border-current text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isSubmitted && isCorrectOption && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        )}
                        {isSubmitted && isSelected && !isCorrectOption && (
                          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation on submit */}
                {isSubmitted && (
                  <div className="pl-8 pt-1">
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-bold flex items-center gap-1 mb-0.5">
                        <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                        Giải thích:
                      </span>
                      <p>{q.explanationVi}</p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Submit or Restart Actions */}
        <div className="pt-2">
          {!isSubmitted ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setIsSubmitted(true)}
              disabled={!allAnswered}
            >
              Nộp bài đọc hiểu ({Object.keys(selectedAnswers).length} / {exercise.questions.length})
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                className="flex-1"
                onClick={() => {
                  setSelectedAnswers({});
                  setIsSubmitted(false);
                }}
              >
                Làm lại bài đọc
              </Button>
              <Link href={`/sets/${setId}`} className="flex-1">
                <Button variant="primary" size="md" className="w-full">
                  Quay lại bộ thẻ
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function ReadingExercisePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-center text-zinc-500">Đang tải bài tập đọc hiểu...</div>
        </AppShell>
      }
    >
      <ReadingExerciseContent />
    </Suspense>
  );
}
