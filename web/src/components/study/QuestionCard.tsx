"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { StudyQuestion } from "@/features/study/question-engine";
import { isAnswerCorrect, evaluateAnswer } from "@/features/study/answer-normalization";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

function getNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

interface QuestionCardProps {
  question: StudyQuestion;
  onAnswer: (isCorrect: boolean, userAnswer: string, durationMs: number) => void;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({
  question,
  onAnswer,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [typeInAnswer, setTypeInAnswer] = useState("");
  const [scrambleAnswer, setScrambleAnswer] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>(() =>
    question.type === "scramble" && question.scrambleTokens ? [...question.scrambleTokens] : []
  );

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAnswerRight, setIsAnswerRight] = useState(false);
  const [userSubmittedAnswer, setUserSubmittedAnswer] = useState("");
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = getNow();
  }, []);

  const handleMultipleChoiceSelect = (optionId: string, label: string) => {
    if (isSubmitted) return;
    const duration = Math.max(0, Math.round(getNow() - startTimeRef.current));
    setSelectedOptionId(optionId);
    setUserSubmittedAnswer(label);

    const isCorrect = isAnswerCorrect(label, question.correctAnswer, question.acceptedAnswers);
    setIsAnswerRight(isCorrect);
    setIsSubmitted(true);
    onAnswer(isCorrect, label, duration);
  };

  const handleTypeInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted || !typeInAnswer.trim()) return;

    const duration = Math.max(0, Math.round(getNow() - startTimeRef.current));
    setUserSubmittedAnswer(typeInAnswer.trim());

    const isCorrect = isAnswerCorrect(typeInAnswer, question.correctAnswer, question.acceptedAnswers);
    setIsAnswerRight(isCorrect);
    setIsSubmitted(true);
    onAnswer(isCorrect, typeInAnswer.trim(), duration);
  };

  const handleScrambleTokenClick = (token: string, tokenIndex: number) => {
    if (isSubmitted) return;
    setScrambleAnswer((prev) => [...prev, token]);
    setAvailableTokens((prev) => prev.filter((_, i) => i !== tokenIndex));
  };

  const handleScrambleReset = () => {
    if (isSubmitted || !question.scrambleTokens) return;
    setAvailableTokens([...question.scrambleTokens]);
    setScrambleAnswer([]);
  };

  const handleScrambleSubmit = () => {
    if (isSubmitted || scrambleAnswer.length === 0) return;
    const assembled = scrambleAnswer.join("");
    const duration = Math.max(0, Math.round(getNow() - startTimeRef.current));
    setUserSubmittedAnswer(assembled);

    const isCorrect = isAnswerCorrect(assembled, question.correctAnswer, question.acceptedAnswers);
    setIsAnswerRight(isCorrect);
    setIsSubmitted(true);
    onAnswer(isCorrect, assembled, duration);
  };

  const analysis = isSubmitted ? evaluateAnswer(userSubmittedAnswer, question.correctAnswer, question.acceptedAnswers) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
        <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
          Câu {questionNumber} / {totalQuestions}
        </span>
        <Badge variant={question.type === "multiple_choice" ? "teal" : "zinc"} size="sm">
          {question.type === "multiple_choice"
            ? "Trắc nghiệm"
            : question.type === "type_in"
            ? "Gõ từ vựng"
            : "Ghép chữ"}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-300"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Main Card */}
      <Card className="p-6 sm:p-8 space-y-6 shadow-xl border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400">
            Nghĩa tiếng Việt
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">
            {question.prompt}
          </h2>
          {question.subPrompt && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {question.subPrompt}
            </p>
          )}
        </div>

        {/* TYPE 1: Multiple Choice Options */}
        {question.type === "multiple_choice" && question.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {question.options.map((opt) => {
              let btnClass = "border border-zinc-200 dark:border-zinc-700 hover:border-teal-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100";

              if (isSubmitted) {
                if (opt.isCorrect) {
                  btnClass = "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600";
                } else if (selectedOptionId === opt.id) {
                  btnClass = "bg-rose-500 text-white border-rose-600 dark:bg-rose-600";
                } else {
                  btnClass = "opacity-50 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200";
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => handleMultipleChoiceSelect(opt.id, opt.label)}
                  className={`p-4 rounded-2xl font-bold text-base transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm ${btnClass}`}
                >
                  <span>{opt.label}</span>
                  {isSubmitted && opt.isCorrect && (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  {isSubmitted && selectedOptionId === opt.id && !opt.isCorrect && (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* TYPE 2: Type-in Input */}
        {question.type === "type_in" && (
          <form onSubmit={handleTypeInSubmit} className="space-y-4 pt-2">
            <div>
              <input
                type="text"
                autoFocus
                disabled={isSubmitted}
                placeholder="Gõ từ tiếng Anh tương ứng..."
                value={typeInAnswer}
                onChange={(e) => setTypeInAnswer(e.target.value)}
                className="w-full text-center text-xl font-bold rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3.5 focus-visible:outline-none focus-visible:border-teal-500"
              />
            </div>

            {!isSubmitted && (
              <Button type="submit" variant="primary" size="lg" className="w-full">
                <span>Kiểm tra đáp án</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </form>
        )}

        {/* TYPE 3: Scramble Tokens */}
        {question.type === "scramble" && (
          <div className="space-y-4 pt-2">
            {/* Answer Box */}
            <div className="min-h-16 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 bg-teal-50/20 dark:bg-teal-950/20 flex flex-wrap items-center justify-center gap-2">
              {scrambleAnswer.length > 0 ? (
                scrambleAnswer.map((tok, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-lg shadow-sm"
                  >
                    {tok}
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-400">Chọn các chữ cái bên dưới theo thứ tự</span>
              )}
            </div>

            {/* Available Tokens to Pick */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {availableTokens.map((tok, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => handleScrambleTokenClick(tok, i)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-teal-100 dark:hover:bg-teal-900 font-black text-lg text-zinc-900 dark:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                >
                  {tok}
                </button>
              ))}
            </div>

            {!isSubmitted && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleScrambleReset}
                  disabled={scrambleAnswer.length === 0}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Làm lại
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleScrambleSubmit}
                  disabled={scrambleAnswer.length === 0}
                >
                  <span>Kiểm tra</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Banner upon submission */}
        {isSubmitted && (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
              isAnswerRight
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100"
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-100"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                {isAnswerRight ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Chính xác! Rất xuất sắc.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <span>Chưa đúng! Đáp án chuẩn: <strong className="underline">{question.correctAnswer}</strong></span>
                  </>
                )}
              </div>

              {analysis?.isTypo && (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Chú ý: Bạn bị sai 1 ký tự so với chính tả chuẩn.</span>
                </p>
              )}

              {question.explanation && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-serif italic pt-1">
                  Ví dụ: &quot;{question.explanation}&quot;
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
