"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DEMO_GRAMMAR_EXERCISES } from "@/data/demo/exercises.demo";
import { shuffleWithSeed } from "@/features/study/engine";
import type { GrammarExerciseSchema } from "@/features/ai/schemas";
import type { z } from "zod";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Delete,
  ArrowRight,
} from "lucide-react";

type GrammarExercise = z.infer<typeof GrammarExerciseSchema>;

interface ExerciseCardProps {
  exercise: GrammarExercise;
  exerciseIndex: number;
  totalExercises: number;
  onNext: () => void;
  onAnswerCorrect: () => void;
  isLast: boolean;
  setId: string;
  onRestart: () => void;
  score: number;
}

function GrammarExerciseCard({
  exercise,
  exerciseIndex,
  totalExercises,
  onNext,
  onAnswerCorrect,
  isLast,
  setId,
  onRestart,
  score,
}: ExerciseCardProps) {
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<{ id: string; text: string }[]>(() => {
    const tokenObjects = exercise.tokens.map((text, idx) => ({
      id: `${exerciseIndex}-${idx}-${text}`,
      text,
    }));
    return shuffleWithSeed(tokenObjects, `grammar-${exerciseIndex}`);
  });
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSelectToken = (token: { id: string; text: string }) => {
    if (isEvaluated) return;
    setSelectedTokens((prev) => [...prev, token.text]);
    setAvailableTokens((prev) => prev.filter((t) => t.id !== token.id));
  };

  const handleRemoveToken = (index: number) => {
    if (isEvaluated) return;
    const removedText = selectedTokens[index];
    const newSelected = selectedTokens.filter((_, idx) => idx !== index);
    setSelectedTokens(newSelected);
    setAvailableTokens((prev) => [
      ...prev,
      { id: `${exerciseIndex}-${Date.now()}-${removedText}`, text: removedText },
    ]);
  };

  const handleResetTokens = () => {
    if (isEvaluated) return;
    const tokenObjects = exercise.tokens.map((text, idx) => ({
      id: `${exerciseIndex}-${idx}-${text}`,
      text,
    }));
    setAvailableTokens(shuffleWithSeed(tokenObjects, `reset-${Date.now()}`));
    setSelectedTokens([]);
  };

  const handleCheckAnswer = () => {
    if (selectedTokens.length === 0 || isEvaluated) return;

    const userSentence = selectedTokens.join(" ");
    const exactMatch = userSentence === exercise.sentenceEn;

    const matchesAccepted = exercise.acceptedTokenOrders.some((order) => {
      if (order.length !== selectedTokens.length) return false;
      return order.every((tok, idx) => tok === selectedTokens[idx]);
    });

    const correct = exactMatch || matchesAccepted;
    setIsCorrect(correct);
    setIsEvaluated(true);
    if (correct) {
      onAnswerCorrect();
    }
  };

  const isComplete = isLast && isEvaluated;

  return (
    <Card className="space-y-6 p-6">
      {/* Vietnamese meaning prompt */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
          Sắp xếp các từ thành câu hoàn chỉnh
        </span>
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {exercise.sentenceVi}
        </p>
      </div>

      {/* Construction Zone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">Câu của bạn:</span>
          {selectedTokens.length > 0 && !isEvaluated && (
            <button
              type="button"
              onClick={handleResetTokens}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Làm lại
            </button>
          )}
        </div>

        <div
          className={`min-h-24 p-4 rounded-xl border-2 border-dashed flex flex-wrap items-center gap-2 transition-colors ${
            isEvaluated
              ? isCorrect
                ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                : "border-rose-500 bg-rose-50/30 dark:bg-rose-950/20"
              : selectedTokens.length > 0
              ? "border-purple-300 dark:border-purple-700 bg-purple-50/20 dark:bg-purple-950/10"
              : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50"
          }`}
        >
          {selectedTokens.length === 0 ? (
            <span className="text-sm text-zinc-400 italic">
              Chạm vào các từ bên dưới để ghép câu...
            </span>
          ) : (
            selectedTokens.map((tok, idx) => (
              <button
                key={`${tok}-${idx}`}
                type="button"
                onClick={() => handleRemoveToken(idx)}
                disabled={isEvaluated}
                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-medium text-sm shadow-sm hover:bg-purple-700 active:scale-95 transition-all flex items-center gap-1"
              >
                <span>{tok}</span>
                {!isEvaluated && <Delete className="w-3 h-3 text-purple-200" />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Available Word Bank */}
      {!isEvaluated && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-500">Ngân hàng từ:</span>
          <div className="flex flex-wrap gap-2 min-h-12 p-2">
            {availableTokens.map((tok) => (
              <button
                key={tok.id}
                type="button"
                onClick={() => handleSelectToken(tok)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-sm shadow-sm hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 active:scale-95 transition-all"
              >
                {tok.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation result banner */}
      {isEvaluated && (
        <div
          className={`p-4 rounded-xl space-y-2 ${
            isCorrect
              ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-900 dark:text-emerald-200">
                  Chính xác! Ngữ pháp hoàn hảo.
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span className="text-rose-900 dark:text-rose-200">
                  Chưa khớp đáp án chuẩn.
                </span>
              </>
            )}
          </div>

          {!isCorrect && (
            <div className="text-xs text-rose-800 dark:text-rose-300">
              <span className="font-semibold">Đáp án tham chiếu: </span>
              <span>{exercise.sentenceEn}</span>
            </div>
          )}

          <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
            {exercise.explanationVi}
          </p>
        </div>
      )}

      {/* Hint button */}
      {!isEvaluated && (
        <div>
          {showHint ? (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Gợi ý: </span>
              {exercise.hintVi}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Xem gợi ý
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="pt-2 flex items-center justify-between">
        {!isEvaluated ? (
          <Button
            variant="primary"
            size="md"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleCheckAnswer}
            disabled={selectedTokens.length === 0}
          >
            Kiểm tra câu trả lời
          </Button>
        ) : isComplete ? (
          <div className="w-full space-y-4 text-center">
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Hoàn thành bài tập! Điểm: {score}/{totalExercises}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onRestart}
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
            className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1"
            onClick={onNext}
          >
            <span>Câu tiếp theo</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function GrammarExerciseContent() {
  const params = useParams();
  const setId = (params?.id as string) || "";

  const [exercises] = useState(DEMO_GRAMMAR_EXERCISES.exercises);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const currentExercise = exercises[currentIndex];

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/sets/${setId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại bộ thẻ
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-500" />
              Ngữ pháp AI
            </Badge>
            <span className="text-xs font-bold text-zinc-500">
              Câu {currentIndex + 1} / {exercises.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>

        {/* Keyed exercise card resets cleanly without setState in effect */}
        <GrammarExerciseCard
          key={currentIndex}
          exercise={currentExercise}
          exerciseIndex={currentIndex}
          totalExercises={exercises.length}
          onNext={handleNext}
          onAnswerCorrect={() => setScore((s) => s + 1)}
          isLast={currentIndex === exercises.length - 1}
          setId={setId}
          onRestart={handleRestart}
          score={score}
        />
      </div>
    </AppShell>
  );
}

export default function GrammarExercisePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-center text-zinc-500">Đang tải bài tập ngữ pháp...</div>
        </AppShell>
      }
    >
      <GrammarExerciseContent />
    </Suspense>
  );
}
