"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { FlashcardViewer } from "@/components/study/FlashcardViewer";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import type { StudyCard } from "@/features/study/question-engine";
import { fetchAllSetCards } from "@/features/sets/sets-client";
import { ArrowLeft, Layers } from "lucide-react";

function FlashcardContent() {
  const params = useParams();
  const setId = params.id as string;

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [setTitle, setSetTitle] = useState("Bộ từ vựng");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCards() {
      // Check demo sets first
      const demoMatch = DEMO_SETS.find((s) => s.id === setId);
      if (demoMatch) {
        const rawList = demoMatch.cards || DEMO_CARDS;
        setCards(
          rawList.map((c) => ({
            id: c.id,
            term: c.term,
            meaningVi: c.meaningVi,
            partOfSpeech: c.partOfSpeech,
            ipa: c.ipa,
            exampleEn: c.exampleEn,
            exampleVi: c.exampleVi,
            acceptedAnswers: c.acceptedAnswers,
          }))
        );
        setSetTitle(demoMatch.title);
        setLoading(false);
        return;
      }

      try {
        const [setRes, fetchedCards] = await Promise.all([
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

        const setData = await setRes.json();
        setSetTitle(setData.data.title);

        if (fetchedCards.length === 0) {
          setError("Bộ từ vựng này chưa có thẻ từ vựng nào để học");
          return;
        }

        setCards(
          fetchedCards.map((c) => ({
            id: c.id,
            term: c.term,
            meaningVi: c.meaningVi,
            partOfSpeech: c.partOfSpeech,
            ipa: c.ipa || undefined,
            exampleEn: c.exampleEn || undefined,
            exampleVi: c.exampleVi || undefined,
            acceptedAnswers: c.acceptedAnswers || [c.term],
          }))
        );
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : "Lỗi tải thẻ học";
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
  }, [setId]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Đang tải Flashcard..." />
      </AppShell>
    );
  }

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
            <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Lật Flashcard: {setTitle}
            </span>
          </div>
        </div>

        {error && <ErrorAlert message={error} />}

        <FlashcardViewer cards={cards} setId={setId} />
      </div>
    </AppShell>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <LoadingState message="Đang tải chế độ Flashcard..." />
        </AppShell>
      }
    >
      <FlashcardContent />
    </Suspense>
  );
}
