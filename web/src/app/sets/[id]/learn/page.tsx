"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { QuestionCard } from "@/components/study/QuestionCard";
import { StudyResults } from "@/components/study/StudyResults";
import { Button } from "@/components/ui/Button";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import {
  generateSessionPlan,
  generateErrorReviewPlan,
  type StudyCard,
  type StudyQuestion,
} from "@/features/study/question-engine";
import { recordLocalAttempt, generateClientEventId } from "@/features/study/study-client-adapter";
import { ArrowLeft, GraduationCap } from "lucide-react";

type StudyStage = "main" | "error_review" | "results";

function LearnContent() {
  const params = useParams();
  const setId = params.id as string;

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [setTitle, setSetTitle] = useState("Bộ từ vựng");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<StudyStage>("main");
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [correctCount, setCorrectCount] = useState(0);
  const [failedCards, setFailedCards] = useState<StudyCard[]>([]);
  const [sessionId] = useState(() => `session_learn_${Date.now()}`);

  const startNewSession = useCallback((cardPool: StudyCard[]) => {
    if (cardPool.length === 0) return;
    const plan = generateSessionPlan(cardPool, {
      allowedTypes: ["multiple_choice", "type_in", "scramble"],
    });

    setQuestions(plan.mainQuestions);
    setCurrentIndex(0);
    setCorrectCount(0);
    setFailedCards([]);
    setStage("main");
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadCards() {
      const demoMatch = DEMO_SETS.find((s) => s.id === setId);
      if (demoMatch) {
        const rawList = demoMatch.cards || DEMO_CARDS;
        const pool: StudyCard[] = rawList.map((c) => ({
          id: c.id,
          term: c.term,
          meaningVi: c.meaningVi,
          partOfSpeech: c.partOfSpeech,
          ipa: c.ipa,
          exampleEn: c.exampleEn,
          exampleVi: c.exampleVi,
          acceptedAnswers: c.acceptedAnswers,
        }));
        setCards(pool);
        setSetTitle(demoMatch.title);
        startNewSession(pool);
        setLoading(false);
        return;
      }

      try {
        const [setRes, cardsRes] = await Promise.all([
          fetch(`/api/sets/${setId}`),
          fetch(`/api/sets/${setId}/cards?limit=500`),
        ]);

        if (ignore) return;

        if (setRes.ok) {
          const setData = await setRes.json();
          setSetTitle(setData.data.title);
        }

        let pool: StudyCard[] = [];
        if (cardsRes.ok) {
          const cardsData = await cardsRes.json();
          if (cardsData.data && cardsData.data.length > 0) {
            interface CardApiRow {
              id: string;
              term: string;
              meaning_vi: string;
              part_of_speech?: string | null;
              ipa?: string | null;
              example_en?: string | null;
              example_vi?: string | null;
              accepted_answers?: string[] | null;
            }
            pool = cardsData.data.map((c: CardApiRow) => ({
              id: c.id,
              term: c.term,
              meaningVi: c.meaning_vi,
              partOfSpeech: c.part_of_speech || undefined,
              ipa: c.ipa || undefined,
              exampleEn: c.example_en || undefined,
              exampleVi: c.example_vi || undefined,
              acceptedAnswers: c.accepted_answers || [c.term],
            }));
          } else {
            pool = DEMO_CARDS;
          }
        } else {
          pool = DEMO_CARDS;
        }

        setCards(pool);
        startNewSession(pool);
      } catch (err: unknown) {
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
      void loadCards();
    }

    return () => {
      ignore = true;
    };
  }, [setId, startNewSession]);

  const handleAnswer = (isCorrect: boolean, userAnswer: string, durationMs: number) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      const targetCard = cards.find((c) => c.id === currentQ.cardId);
      if (targetCard && !failedCards.some((c) => c.id === targetCard.id)) {
        setFailedCards((prev) => [...prev, targetCard]);
      }
    }

    // Record attempt persistently
    recordLocalAttempt({
      clientEventId: generateClientEventId(),
      sessionId,
      setId,
      cardId: currentQ.cardId,
      mode: "learn",
      questionType: currentQ.type,
      userAnswer,
      isCorrect,
      durationMs,
      answeredAt: new Date().toISOString(),
    });
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStage("results");
    }
  };

  const handleStartErrorReview = () => {
    if (failedCards.length === 0) return;
    const errorPlan = generateErrorReviewPlan(failedCards, cards);
    setQuestions(errorPlan.mainQuestions);
    setCurrentIndex(0);
    setStage("error_review");
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Đang chuẩn bị phiên học thích ứng..." />
      </AppShell>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href={`/sets/${setId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại học phần</span>
          </Link>

          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {stage === "error_review" ? "Ôn lỗi sai: " : "Học thích ứng: "}
              {setTitle}
            </span>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {/* Content Stages */}
        {stage === "results" ? (
          <StudyResults
            setId={setId}
            totalQuestions={questions.length}
            correctCount={correctCount}
            failedCards={failedCards}
            onStartErrorReview={failedCards.length > 0 ? handleStartErrorReview : undefined}
            onRestart={() => startNewSession(cards)}
            modeName="Học thích ứng"
          />
        ) : currentQuestion ? (
          <div className="space-y-4">
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={handleAnswer}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
            />

            <div className="max-w-2xl mx-auto flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNextQuestion}
              >
                <span>{currentIndex < questions.length - 1 ? "Câu tiếp theo" : "Xem kết quả"}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <LoadingState message="Đang tải chế độ Học..." />
        </AppShell>
      }
    >
      <LearnContent />
    </Suspense>
  );
}
