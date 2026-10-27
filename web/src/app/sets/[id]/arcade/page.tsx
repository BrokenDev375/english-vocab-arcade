"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ArcadeClient } from "@/components/arcade/ArcadeClient";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import { fetchAllSetCards } from "@/features/sets/sets-client";
import type { LearningSet, VocabularyCard } from "@/contracts/vocabulary";

function ArcadePageContent() {
  const params = useParams();
  const id = params.id as string;

  const [currentSet, setCurrentSet] = useState<LearningSet | null>(null);
  const [cards, setCards] = useState<VocabularyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      // 1. Check demo sets
      const demoMatch = DEMO_SETS.find((s) => s.id === id);
      if (demoMatch) {
        setCurrentSet(demoMatch);
        setCards(demoMatch.cards || DEMO_CARDS);
        setLoading(false);
        return;
      }

      // 2. Fetch from API
      try {
        const [setRes, fetchedCards] = await Promise.all([fetch(`/api/sets/${id}`), fetchAllSetCards(id)]);
        if (ignore) return;
        if (!setRes.ok) throw new Error("Không tìm thấy học phần hoặc bạn không có quyền truy cập.");
        const { data } = await setRes.json();
        if (!fetchedCards.length) throw new Error("Học phần chưa có thẻ để chơi.");
        setCurrentSet({ id: data.id, title: data.title, description: data.description, language: "en", cefrLevel: data.cefr_level || "mixed", topic: data.topic || "general", isPublic: data.is_public, cardCount: fetchedCards.length, createdAt: data.created_at, updatedAt: data.updated_at });
        setCards(fetchedCards.map(c => ({ ...c, reviewStatus: "draft", acceptedAnswers: c.acceptedAnswers || [c.term], partOfSpeech: c.partOfSpeech as VocabularyCard["partOfSpeech"], cefrLevel: c.cefrLevel as VocabularyCard["cefrLevel"], ipa: c.ipa || undefined, exampleEn: c.exampleEn || undefined, exampleVi: c.exampleVi || undefined })));
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

    if (id) {
      void loadData();
    }

    return () => {
      ignore = true;
    };
  }, [id]);

  if (error) return <AppShell><ErrorAlert message={error} /><button onClick={() => window.location.reload()}>Thử lại</button></AppShell>;

  if (loading || !currentSet) {
    return (
      <AppShell>
        <LoadingState message="Đang nạp dữ liệu Word Blaster Arcade..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {error && <ErrorAlert message={error} />}
      <ArcadeClient key={currentSet.id} currentSet={currentSet} cards={cards} />
    </AppShell>
  );
}

export default function ArcadePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <LoadingState message="Đang chuẩn bị màn chơi Word Blaster..." />
        </AppShell>
      }
    >
      <ArcadePageContent />
    </Suspense>
  );
}
