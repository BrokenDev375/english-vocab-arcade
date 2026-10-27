"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import {
  playEnglishSpeech,
  gradeSpeechTranscript,
  type SpeechGradeResult,
} from "@/features/audio/speech-adapter";
import {
  ArrowLeft,
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Keyboard,
} from "lucide-react";

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: () => void;
  onend: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: unknown) => void;
}

function SpeakContent() {
  const params = useParams();
  const setId = (params?.id as string) || "";

  const demoMatch = DEMO_SETS.find((s) => s.id === setId);
  const cards = demoMatch?.cards || DEMO_CARDS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [evalResult, setEvalResult] = useState<SpeechGradeResult | null>(null);
  const [useKeyboardFallback, setUseKeyboardFallback] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [micError, setMicError] = useState<string | null>(null);

  const currentCard = cards[currentIndex] || cards[0];

  const handlePlaySample = () => {
    setIsPlayingAudio(true);
    playEnglishSpeech(currentCard.term, {
      rate: 0.9,
      voiceLang: "en-US",
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const startVoiceRecording = () => {
    // Check SpeechRecognition support in browser
    const windowAny = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };

    const SpeechRec = windowAny.SpeechRecognition || windowAny.webkitSpeechRecognition;

    if (!SpeechRec) {
      setMicError("Trình duyệt không hỗ trợ Web Speech API trực tiếp. Hãy dùng chế độ gõ bàn phím.");
      setUseKeyboardFallback(true);
      return;
    }

    try {
      setMicError(null);
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[0]?.[0]?.transcript || "";
        setTranscript(text);
        const grade = gradeSpeechTranscript(
          text,
          currentCard.term,
          currentCard.acceptedAnswers || []
        );
        setEvalResult(grade);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setMicError("Không nhận được tín hiệu micro hoặc bị từ chối quyền truy cập.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
      setMicError("Lỗi khởi tạo micro. Hãy thử dùng chế độ gõ kiểm tra.");
    }
  };

  const handleManualCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedAnswer.trim()) return;

    const grade = gradeSpeechTranscript(
      typedAnswer,
      currentCard.term,
      currentCard.acceptedAnswers || []
    );
    setTranscript(typedAnswer);
    setEvalResult(grade);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setTranscript("");
      setEvalResult(null);
      setTypedAnswer("");
      setMicError(null);
    }
  };

  const isComplete = currentIndex === cards.length - 1 && evalResult !== null;

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
            <Badge variant="teal" size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Luyện phát âm
            </Badge>
            <span className="text-xs font-bold text-zinc-500">
              {currentIndex + 1} / {cards.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300"
            style={{
              width: `${((currentIndex + (evalResult ? 1 : 0)) / cards.length) * 100}%`,
            }}
          />
        </div>

        {/* Speech Card */}
        <Card className="p-8 space-y-6 text-center">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Luyện nói từ vựng
            </span>

            {/* Target word & IPA */}
            <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {currentCard.term}
            </h1>

            {currentCard.ipa && (
              <p className="text-sm font-mono text-zinc-500">{currentCard.ipa}</p>
            )}

            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium pt-1">
              {currentCard.meaningVi}
            </p>
          </div>

          {/* Audio Sample Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlaySample}
              className="inline-flex items-center gap-2 text-xs"
            >
              <Volume2 className={`w-4 h-4 text-teal-600 ${isPlayingAudio ? "animate-pulse" : ""}`} />
              <span>Nghe phát âm chuẩn</span>
            </Button>
          </div>

          {/* Voice Record or Keyboard Fallback */}
          <div className="py-4 border-t border-b border-zinc-100 dark:border-zinc-800 space-y-4">
            {!useKeyboardFallback ? (
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={startVoiceRecording}
                  disabled={isRecording}
                  className={`rounded-full w-20 h-20 p-0 mx-auto shadow-xl flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-rose-600 animate-bounce ring-4 ring-rose-200"
                      : "bg-teal-600 hover:bg-teal-700"
                  }`}
                  title="Nhấn để thu âm"
                >
                  {isRecording ? (
                    <Mic className="w-10 h-10 text-white animate-pulse" />
                  ) : (
                    <Mic className="w-10 h-10 text-white" />
                  )}
                </Button>

                <p className="text-xs text-zinc-500">
                  {isRecording
                    ? "Đang lắng nghe... Hãy nói từ trên vào micro."
                    : "Chạm vào micro và phát âm to, rõ ràng"}
                </p>

                {micError && (
                  <p className="text-xs text-rose-500 font-medium">{micError}</p>
                )}

                <button
                  type="button"
                  onClick={() => setUseKeyboardFallback(true)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 inline-flex items-center gap-1"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Không tiện nói? Chuyển sang gõ kiểm tra
                </button>
              </div>
            ) : (
              <form onSubmit={handleManualCheck} className="space-y-3">
                <Input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Gõ từ để kiểm tra nhận diện..."
                  className="text-center font-bold"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setUseKeyboardFallback(false)}
                    className="flex-1"
                  >
                    <MicOff className="w-4 h-4 mr-1 text-zinc-400" />
                    Quay lại Micro
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    className="flex-1"
                    disabled={!typedAnswer.trim()}
                  >
                    Kiểm tra
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Evaluation Result */}
          {evalResult && (
            <div
              className={`p-4 rounded-xl space-y-2 text-left ${
                evalResult.isMatch
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {evalResult.isMatch ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-900 dark:text-emerald-200">
                        {evalResult.feedback}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-amber-900 dark:text-amber-200">
                        {evalResult.feedback}
                      </span>
                    </>
                  )}
                </div>

                <Badge
                  variant={evalResult.isMatch ? "teal" : "zinc"}
                  size="sm"
                >
                  Độ khớp: {evalResult.score}%
                </Badge>
              </div>

              {transcript && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold">Từ nhận diện được: </span>
                  &ldquo;{transcript}&rdquo;
                </p>
              )}

              {/* Strict disclaimer conforming to AGENTS.md */}
              <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50 italic">
                Lưu ý: Độ khớp từ nhận diện qua micro mang tính chất hỗ trợ học tập, không thay thế chấm thi IELTS hay đánh giá ngữ điệu chuyên sâu.
              </p>
            </div>
          )}

          {/* Actions */}
          {evalResult && (
            <div className="pt-2">
              {isComplete ? (
                <div className="space-y-4 text-center">
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Đã hoàn thành lượt luyện phát âm!
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setCurrentIndex(0);
                        setTranscript("");
                        setEvalResult(null);
                      }}
                    >
                      Luyện lại
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
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <span>Từ tiếp theo</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default function SpeakPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-8 text-center text-zinc-500">Đang tải phòng luyện phát âm...</div>
        </AppShell>
      }
    >
      <SpeakContent />
    </Suspense>
  );
}
