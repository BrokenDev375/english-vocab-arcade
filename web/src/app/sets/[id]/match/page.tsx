"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { MatchGameClient } from "@/components/match/MatchGameClient";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import type { MatchCard } from "@/features/match/engine";

function MatchContent() {
  const params = useParams();
  const setId = params.id as string;

  const [cards, setCards] = useState<MatchCard[]>([]);
  const [setTitle, setSetTitle] = useState("Bộ từ vựng");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCards() {
      // 1. Check demo sets
      const demoMatch = DEMO_SETS.find((s) => s.id === setId);
      if (demoMatch) {
        const rawList = demoMatch.cards || DEMO_CARDS;
        setCards(
          rawList.map((c) => ({
            id: c.id,
            term: c.term,
            meaningVi: c.meaningVi,
          }))
        );
        setSetTitle(demoMatch.title);
        setLoading(false);
        return;
      }

      // 2. Fetch from API
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

        if (cardsRes.ok) {
          const cardsData = await cardsRes.json();
          if (cardsData.data && cardsData.data.length > 0) {
            interface CardApiRow {
              id: string;
              term: string;
              meaning_vi: string;
            }
            setCards(
              cardsData.data.map((c: CardApiRow) => ({
                id: c.id,
                term: c.term,
                meaningVi: c.meaning_vi,
              }))
            );
          } else {
            setCards(
              DEMO_CARDS.map((c) => ({
                id: c.id,
                term: c.term,
                meaningVi: c.meaningVi,
              }))
            );
          }
        } else {
          setCards(
            DEMO_CARDS.map((c) => ({
              id: c.id,
              term: c.term,
              meaningVi: c.meaningVi,
            }))
          );
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
        <LoadingState message="Đang chuẩn bị bảng Ghép thẻ..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {error && <ErrorAlert message={error} />}
      <MatchGameClient setId={setId} setTitle={setTitle} cards={cards} />
    </AppShell>
  );
}

export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <LoadingState message="Đang tải chế độ Ghép thẻ..." />
        </AppShell>
      }
    >
      <MatchContent />
    </Suspense>
  );
}
