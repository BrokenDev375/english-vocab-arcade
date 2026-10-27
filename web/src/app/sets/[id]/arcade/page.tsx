"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ArcadeClient } from "@/components/arcade/ArcadeClient";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
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
        const [setRes, cardsRes] = await Promise.all([
          fetch(`/api/sets/${id}`),
          fetch(`/api/sets/${id}/cards?limit=500`),
        ]);

        if (ignore) return;

        let loadedSet: LearningSet = DEMO_SETS[0];
        if (setRes.ok) {
          const setData = await setRes.json();
          loadedSet = {
            id: setData.data.id,
            title: setData.data.title,
            description: setData.data.description,
            language: "en",
            cefrLevel: setData.data.cefr_level || "mixed",
            topic: setData.data.topic || "general",
            isPublic: setData.data.is_public,
            cardCount: setData.data.card_count || 0,
            createdAt: setData.data.created_at,
            updatedAt: setData.data.updated_at,
          };
        }
        setCurrentSet(loadedSet);

        if (cardsRes.ok) {
          const cardsData = await cardsRes.json();
          if (cardsData.data && cardsData.data.length > 0) {
            interface ApiCard {
              id: string;
              term: string;
              meaning_vi: string;
              part_of_speech?: string | null;
              cefr_level?: "A1" | "A2" | "B1" | null;
              ipa?: string | null;
              example_en?: string | null;
              example_vi?: string | null;
              accepted_answers?: string[] | null;
            }
            setCards(
              cardsData.data.map((c: ApiCard) => ({
                id: c.id,
                term: c.term,
                meaningVi: c.meaning_vi,
                partOfSpeech: (c.part_of_speech as VocabularyCard["partOfSpeech"]) || "noun",
                cefrLevel: c.cefr_level || undefined,
                ipa: c.ipa || undefined,
                exampleEn: c.example_en || undefined,
                exampleVi: c.example_vi || undefined,
                acceptedAnswers: c.accepted_answers || [c.term],
              }))
            );
          } else {
            setCards(DEMO_CARDS);
          }
        } else {
          setCards(DEMO_CARDS);
        }
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
      <ArcadeClient currentSet={currentSet} cards={cards} />
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
