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
  type StudyCard,
  type StudyQuestion,
} from "@/features/study/question-engine";
import { recordLocalAttempt, generateClientEventId } from "@/features/study/study-client-adapter";
import { ArrowLeft, Award } from "lucide-react";

function TestContent() {
  const params = useParams();
  const setId = params.id as string;

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [setTitle, setSetTitle] = useState("Bộ từ vựng");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [failedCards, setFailedCards] = useState<StudyCard[]>([]);
  const [sessionId] = useState(() => `session_test_${Date.now()}`);

  const startTest = useCallback((pool: StudyCard[]) => {
    if (pool.length === 0) return;
    const plan = generateSessionPlan(pool, {
      allowedTypes: ["multiple_choice", "type_in"],
    });

    setQuestions(plan.mainQuestions);
    setCurrentIndex(0);
    setCorrectCount(0);
    setFailedCards([]);
    setIsFinished(false);
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
        startTest(pool);
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
        startTest(pool);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : "Lỗi tải bài kiểm tra";
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
  }, [setId, startTest]);

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

    recordLocalAttempt({
      clientEventId: generateClientEventId(),
      sessionId,
      setId,
      cardId: currentQ.cardId,
      mode: "test",
      questionType: currentQ.type,
      userAnswer,
      isCorrect,
      durationMs,
      answeredAt: new Date().toISOString(),
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Đang chuẩn bị đề kiểm tra..." />
      </AppShell>
    );
  }

  const currentQ = questions[currentIndex];

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
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Kiểm tra: {setTitle}
            </span>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        {isFinished ? (
          <StudyResults
            setId={setId}
            totalQuestions={questions.length}
            correctCount={correctCount}
            failedCards={failedCards}
            onRestart={() => startTest(cards)}
            modeName="Bài kiểm tra"
          />
        ) : currentQ ? (
          <div className="space-y-4">
            <QuestionCard
              key={currentQ.id}
              question={currentQ}
              onAnswer={handleAnswer}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
            />

            <div className="max-w-2xl mx-auto flex justify-end">
              <Button type="button" variant="primary" size="md" onClick={handleNext}>
                <span>{currentIndex < questions.length - 1 ? "Câu tiếp theo" : "Xem kết quả bài thi"}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function TestPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <LoadingState message="Đang tải chế độ Kiểm tra..." />
        </AppShell>
      }
    >
      <TestContent />
    </Suspense>
  );
}
