"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import { playEnglishSpeech } from "@/features/audio/speech-adapter";
import { isAnswerCorrect } from "@/features/study/engine";
import { fetchAllSetCards } from "@/features/sets/sets-client";
import {
  recordLocalAttempt,
  generateClientEventId,
  initServerSession,
  sendServerAttempt,
} from "@/features/study/study-client-adapter";
import {
  ArrowLeft,
  Volume2,
  Volume1,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Headphones,
} from "lucide-react";

interface StudyCard {
  id: string;
  term: string;
  meaningVi: string;
  ipa?: string;
  acceptedAnswers?: string[];
}

function DictationContent() {
  const params = useParams();
  const setId = (params?.id as string) || "";

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [setTitle, setSetTitle] = useState("Bộ từ vựng");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMeaningHint, setShowMeaningHint] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionId] = useState(() => `session_dict_${Date.now()}`);
  const serverSessionRef = useRef<{ sessionId: string; version: number } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCards() {
      const demoMatch = DEMO_SETS.find((s) => s.id === setId);
      if (demoMatch) {
        const rawList = demoMatch.cards || DEMO_CARDS;
        setCards(
          rawList.map((c) => ({
            id: c.id,
            term: c.term,
            meaningVi: c.meaningVi,
            ipa: c.ipa || undefined,
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
          setError("Bộ từ vựng này chưa có thẻ từ vựng nào để luyện nghe chính tả");
          return;
        }

        setCards(
          fetchedCards.map((c) => ({
            id: c.id,
            term: c.term,
            meaningVi: c.meaningVi,
            ipa: c.ipa || undefined,
            acceptedAnswers: c.acceptedAnswers || [c.term],
          }))
        );

        void initServerSession(setId, "dictation").then((sess) => {
          if (sess && !ignore) {
            serverSessionRef.current = sess;
          }
        });
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

  const currentCard = cards[currentIndex] || cards[0];

  const handlePlayAudio = (rate: number = 1.0) => {
    if (!currentCard) return;
    setIsPlaying(true);
    playEnglishSpeech(currentCard.term, {
      rate,
      voiceLang: "en-US",
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const handleCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCard || !userAnswer.trim() || isEvaluated) return;

    const correct = isAnswerCorrect(
      userAnswer,
      currentCard.term,
      currentCard.acceptedAnswers || [currentCard.term]
    );

    setIsCorrect(correct);
    setIsEvaluated(true);
    if (correct) {
      setScore((s) => s + 1);
    }

    const clientEventId = generateClientEventId();
    const effectiveSessionId = serverSessionRef.current?.sessionId || sessionId;

    recordLocalAttempt({
      clientEventId,
      sessionId: effectiveSessionId,
      setId,
      cardId: currentCard.id,
      mode: "learn",
      questionType: "type_in",
      userAnswer,
      isCorrect: correct,
      durationMs: 3000,
      answeredAt: new Date().toISOString(),
    });

    if (serverSessionRef.current) {
      const currentSess = serverSessionRef.current;
      void sendServerAttempt({
        sessionId: currentSess.sessionId,
        cardId: currentCard.id,
        clientEventId,
        questionKey: `dict_${currentCard.id}`,
        attemptKind: "answer",
        answerText: userAnswer,
        activeElapsedMs: 3000,
        expectedVersion: currentSess.version,
      }).then((res) => {
        if (res?.newVersion && serverSessionRef.current) {
          serverSessionRef.current.version = res.newVersion;
        }
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setUserAnswer("");
      setIsEvaluated(false);
      setIsCorrect(false);
      setShowMeaningHint(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Đang chuẩn bị bài nghe chính tả..." />
      </AppShell>
    );
  }

  if (error || !currentCard) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto space-y-4">
          <ErrorAlert message={error || "Không có thẻ từ vựng"} />
          <Link href={`/sets/${setId}`} className="inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại học phần
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const isComplete = currentIndex === cards.length - 1 && isEvaluated;

  return (
    <AppShell>
      <div className="max-w-xl mx-auto space-y-6">
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
            <Badge variant="navy" size="sm">
              <Headphones className="w-3.5 h-3.5 mr-1" />
              {setTitle}: Nghe chính tả
            </Badge>
            <span className="text-xs font-bold text-zinc-500">
              {currentIndex + 1} / {cards.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{
              width: `${((currentIndex + (isEvaluated ? 1 : 0)) / cards.length) * 100}%`,
            }}
          />
        </div>

        {/* Audio Player Card */}
        <Card className="p-8 space-y-6 text-center">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Luyện nghe và gõ lại từ vựng
            </span>
            <p className="text-sm text-zinc-500">
              Bấm vào loa để nghe phát âm, sau đó nhập chính xác từ bạn nghe được.
            </p>
          </div>

          {/* Audio Play Buttons */}
          <div className="flex items-center justify-center gap-3 py-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handlePlayAudio(1.0)}
              className="rounded-full w-16 h-16 p-0 shadow-lg shadow-blue-500/25 flex items-center justify-center bg-blue-600 hover:bg-blue-700"
              title="Nghe tốc độ chuẩn"
            >
              <Volume2 className={`w-8 h-8 text-white ${isPlaying ? "animate-pulse" : ""}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePlayAudio(0.75)}
              className="rounded-full px-3 py-1.5 text-xs flex items-center gap-1 text-zinc-600 dark:text-zinc-300"
              title="Nghe tốc độ chậm"
            >
              <Volume1 className="w-4 h-4" />
              <span>Chậm (0.75x)</span>
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleCheck} className="space-y-4">
            <Input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={isEvaluated}
              placeholder="Gõ từ bạn nghe được..."
              className="w-full text-center text-lg font-bold tracking-wide"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              autoFocus
            />

            {/* Evaluation banner */}
            {isEvaluated && (
              <div
                className={`p-4 rounded-xl space-y-2 text-left ${
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
                        Chính xác! Bạn nghe và viết đúng từ.
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <span className="text-rose-900 dark:text-rose-200">
                        Chưa chính xác.
                      </span>
                    </>
                  )}
                </div>

                <div className="text-sm space-y-0.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                      {currentCard.term}
                    </span>
                    {currentCard.ipa && (
                      <span className="text-xs font-mono text-zinc-500">
                        {currentCard.ipa}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {currentCard.meaningVi}
                  </p>
                </div>
              </div>
            )}

            {/* Meaning hint */}
            {!isEvaluated && (
              <div>
                {showMeaningHint ? (
                  <p className="text-xs text-zinc-500">
                    Nghĩa gợi ý: <strong>{currentCard.meaningVi}</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMeaningHint(true)}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 inline-flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Xem nghĩa gợi ý
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2">
              {!isEvaluated ? (
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!userAnswer.trim()}
                >
                  Kiểm tra từ
                </Button>
              ) : isComplete ? (
                <div className="space-y-4 text-center">
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Hoàn thành bài chính tả! Kết quả: {score}/{cards.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setCurrentIndex(0);
                        setUserAnswer("");
                        setIsEvaluated(false);
                        setScore(0);
                      }}
                    >
                      Làm lại
                    </Button>
                    <Link href={`/sets/${setId}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        Quay lại bộ thẻ
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <span>Từ tiếp theo</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}

export default function DictationPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-center text-zinc-500">Đang tải bài nghe chính tả...</div>
        </AppShell>
      }
    >
      <DictationContent />
    </Suspense>
  );
}
