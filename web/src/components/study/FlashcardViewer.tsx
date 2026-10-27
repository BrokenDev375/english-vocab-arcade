"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Volume2,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Shuffle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import type { StudyCard } from "@/features/study/question-engine";
import { shuffle } from "@/features/study/shuffle";
import { recordLocalAttempt, generateClientEventId } from "@/features/study/study-client-adapter";

interface FlashcardViewerProps {
  cards: StudyCard[];
  setId: string;
}

export function FlashcardViewer({ cards: initialCards, setId }: FlashcardViewerProps) {
  const [cards, setCards] = useState<StudyCard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionId] = useState(() => `session_fc_${Date.now()}`);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [forgotCount, setForgotCount] = useState(0);

  const currentCard = cards[currentIndex] || cards[0];

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
  }, [cards.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  }, [cards.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleSpeech = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!currentCard || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentCard.term);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    },
    [currentCard]
  );

  const handleRate = useCallback(
    (remembered: boolean) => {
      if (!currentCard) return;

      if (remembered) {
        setRememberedCount((c) => c + 1);
      } else {
        setForgotCount((c) => c + 1);
      }

      // Record flashcard self-rating attempt (distinguished from verified testing)
      recordLocalAttempt({
        clientEventId: generateClientEventId(),
        sessionId,
        setId,
        cardId: currentCard.id,
        mode: "flashcard",
        questionType: "flashcard_self_rate",
        userAnswer: remembered ? "remembered" : "forgot",
        isCorrect: remembered,
        durationMs: 2000,
        answeredAt: new Date().toISOString(),
      });

      handleNext();
    },
    [currentCard, handleNext, sessionId, setId]
  );

  const handleShuffleCards = () => {
    setIsFlipped(false);
    setCards((prev) => shuffle(prev));
    setCurrentIndex(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "1") {
        e.preventDefault();
        handleRate(false);
      } else if (e.key === "2") {
        e.preventDefault();
        handleRate(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleRate]);

  if (!currentCard) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Controls & Counter */}
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
            {currentIndex + 1} / {cards.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {rememberedCount}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {forgotCount}
            </span>
          </div>
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={handleShuffleCards}>
          <Shuffle className="w-3.5 h-3.5 mr-1" />
          Xáo trộn
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* 3D Flip Card */}
      <div
        className="w-full h-80 sm:h-96 cursor-pointer select-none [perspective:1000px]"
        onClick={handleFlip}
      >
        <div
          className={`relative w-full h-full duration-500 [transform-style:preserve-3d] transition-transform ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* FRONT */}
          <Card
            className="absolute inset-0 p-8 flex flex-col justify-between [backface-visibility:hidden] border-2 border-zinc-200 dark:border-zinc-800 shadow-xl bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/60 rounded-3xl"
          >
            <div className="flex items-center justify-between">
              {currentCard.partOfSpeech ? (
                <Badge variant="teal" size="md">
                  {currentCard.partOfSpeech}
                </Badge>
              ) : <div />}

              <button
                type="button"
                onClick={handleSpeech}
                className="p-2.5 rounded-full bg-zinc-100 hover:bg-teal-100 dark:bg-zinc-800 dark:hover:bg-teal-950/60 text-zinc-700 dark:text-zinc-200 hover:text-teal-600 transition-colors"
                title="Nghe phát âm (Voice)"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                {currentCard.term}
              </h2>
              {currentCard.ipa && (
                <p className="text-sm sm:text-base font-mono text-zinc-500">
                  {currentCard.ipa}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Nhấn để xem nghĩa tiếng Việt (hoặc Space)</span>
            </div>
          </Card>

          {/* BACK */}
          <Card
            className="absolute inset-0 p-8 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] border-2 border-teal-500/40 shadow-xl bg-gradient-to-b from-teal-50/20 via-white to-zinc-50 dark:from-teal-950/20 dark:via-zinc-900 dark:to-zinc-900 rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <Badge variant="zinc" size="sm">
                Nghĩa tiếng Việt
              </Badge>
              <button
                type="button"
                onClick={handleSpeech}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-teal-600"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-teal-700 dark:text-teal-400 leading-snug">
                {currentCard.meaningVi}
              </h3>

              {currentCard.exampleEn && (
                <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 text-left text-xs sm:text-sm space-y-1">
                  <p className="font-serif italic text-zinc-900 dark:text-zinc-100">
                    &quot;{currentCard.exampleEn}&quot;
                  </p>
                  {currentCard.exampleVi && (
                    <p className="text-zinc-500">{currentCard.exampleVi}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Nhấn để lật lại mặt trước</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handlePrev}
          title="Thẻ trước (Phím mũi tên trái)"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Trước</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={() => handleRate(false)}
            className="px-4 sm:px-6"
            title="Đánh dấu chưa nhớ (Phím 1)"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            <span>Chưa nhớ (1)</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleRate(true)}
            className="px-4 sm:px-6"
            title="Đánh dấu đã nhớ (Phím 2)"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>Đã nhớ (2)</span>
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleNext}
          title="Thẻ tiếp theo (Phím mũi tên phải)"
        >
          <span>Sau</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Helpful Hint Tip */}
      <div className="text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Phím tắt: Space để lật thẻ • Mũi tên để chuyển thẻ • 1: Chưa nhớ • 2: Đã nhớ</span>
      </div>
    </div>
  );
}
