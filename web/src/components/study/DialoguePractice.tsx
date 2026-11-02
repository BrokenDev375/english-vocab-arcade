"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Keyboard,
  MessageSquare,
  Mic,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StudyHeader } from "./StudyHeader";
import { SyncNotice } from "./SyncNotice";
import { requestAiBatch } from "@/features/ai/ai-client";
import type { DialogueOutput } from "@/features/ai/schemas";
import { DEMO_DIALOGUE } from "@/data/demo/dialogue.demo";
import { fetchAllSetCards, isDemoSetId } from "@/features/sets/sets-client";
import { useStudySession } from "@/features/study/use-study-session";
import { useElapsedTime } from "@/features/study/use-elapsed-time";
import { isAnswerCorrect } from "@/features/study/answer-normalization";
import { playEnglishSpeech } from "@/features/audio/speech-adapter";

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  abort(): void;
  onresult:
    | ((event: {
        results: { [key: number]: { [key: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export function DialoguePractice() {
  const { id } = useParams<{ id: string }>();
  const [output, setOutput] = useState<DialogueOutput | null>(null);
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"A" | "B">("A");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<number, { text: string; correct: boolean }>
  >({});
  const [text, setText] = useState("");
  const [completed, setCompleted] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        if (isDemoSetId(id)) {
          setOutput(DEMO_DIALOGUE);
          setBatchId("demo");
          return;
        }
        const cards = await fetchAllSetCards(id);
        if (!cards.length)
          throw new Error("Học phần chưa có từ để tạo hội thoại.");
        const result = await requestAiBatch<DialogueOutput>(
          id,
          "dialogue",
          cards.slice(0, 6).map((card) => card.id),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setOutput(result.output);
          setBatchId(result.batchId);
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tạo được hội thoại.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);
  const sync = useStudySession(
    id,
    "dialogue",
    {
      output,
      batchId,
      role,
      currentIndex,
      answers,
      text,
      completed,
      showTranslation,
    },
    (value) => {
      if (value.output) setOutput(value.output as DialogueOutput);
      if (value.batchId) setBatchId(String(value.batchId));
      setRole(value.role === "B" ? "B" : "A");
      setCurrentIndex(Number(value.currentIndex) || 0);
      setAnswers((value.answers || {}) as typeof answers);
      setText(String(value.text || ""));
      setCompleted(Boolean(value.completed));
      setShowTranslation(value.showTranslation !== false);
    },
    !loading && !error && !!output,
    completed ? "completed" : "active",
  );
  const elapsed = useElapsedTime(currentIndex, sync.ready);
  useEffect(
    () => () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onresult = null;
        recognition.current.onerror = null;
        recognition.current.abort();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [],
  );
  const turn = output?.turns[currentIndex];
  const ownTurn = turn?.role === role;
  const answer = answers[currentIndex];
  const submit = () => {
    if (!turn || !ownTurn || answer || !text.trim() || !sync.ready) return;
    const correct = isAnswerCorrect(text, turn.textEn);
    setAnswers((value) => ({ ...value, [currentIndex]: { text, correct } }));
    sync.record(
      {
        clientEventId: sync.newEventId(),
        cardId: turn.cardId,
        mode: "learn",
        questionType: "type_in",
        userAnswer: text,
        isCorrect: correct,
        durationMs: elapsed(),
        answeredAt: new Date().toISOString(),
      },
      `ai:${batchId}:${currentIndex}`,
    );
  };
  const next = () => {
    recognition.current?.abort();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setListening(false);
    setSpeechError(null);
    setText("");
    if (currentIndex + 1 >= (output?.turns.length || 0)) setCompleted(true);
    else setCurrentIndex((value) => value + 1);
  };
  const changeRole = (nextRole: "A" | "B") => {
    recognition.current?.abort();
    void sync.restart(() => {
      setRole(nextRole);
      setCurrentIndex(0);
      setAnswers({});
      setText("");
      setCompleted(false);
      setListening(false);
      setSpeechError(null);
    });
  };
  const listen = () => {
    if (listening) {
      recognition.current?.abort();
      setListening(false);
      return;
    }
    const browser = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor =
      browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) {
      setSpeechError(
        "Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn có thể gõ câu trả lời bên dưới.",
      );
      return;
    }
    try {
      recognition.current?.abort();
      const instance = new Constructor();
      recognition.current = instance;
      instance.lang = "en-US";
      instance.continuous = false;
      instance.interimResults = false;
      instance.onresult = (event) =>
        setText(event.results[0]?.[0]?.transcript || "");
      instance.onerror = () => {
        setSpeechError(
          "Chưa nhận được giọng nói. Hãy kiểm tra quyền micro hoặc gõ câu trả lời.",
        );
        setListening(false);
      };
      instance.onend = () => setListening(false);
      setSpeechError(null);
      setListening(true);
      instance.start();
    } catch {
      setListening(false);
      setSpeechError("Chưa mở được micro. Bạn có thể gõ câu trả lời.");
    }
  };
  return (
    <AppShell showDemoBanner={isDemoSetId(id)}>
      <div className="mx-auto max-w-3xl space-y-6">
        <StudyHeader
          setId={id}
          title="Hội thoại tiếng Anh"
          subtitle="Nghe, đọc và luyện giao tiếp theo vai A/B"
          current={completed ? output?.turns.length : currentIndex + 1}
          total={output?.turns.length}
        />
        <SyncNotice
          message={sync.error}
          ready={sync.ready}
          retry={sync.retry}
        />
        {error ? (
          <div className="space-y-4">
            <ErrorAlert message={error} />
            <Button onClick={() => window.location.reload()}>Thử lại</Button>
            <Link href={`/sets/${id}`} className="ml-3 text-sm text-indigo-600">
              Quay lại học phần
            </Link>
          </div>
        ) : loading || !sync.ready ? (
          <LoadingState message="Đang chuẩn bị hội thoại..." />
        ) : (
          output && (
            <>
              <div className="space-y-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
                <h2 className="flex items-center gap-2 text-xl font-extrabold">
                  <MessageSquare className="size-5 text-purple-500" />
                  {output.title}
                </h2>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {output.situationVi}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs font-semibold text-zinc-500">
                    Chọn vai luyện:
                  </span>
                  {(["A", "B"] as const).map((value) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={role === value ? "primary" : "outline"}
                      aria-pressed={role === value}
                      disabled={listening}
                      onClick={() => {
                        if (role !== value) changeRole(value);
                      }}
                    >
                      Luyện vai {value}
                    </Button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={showTranslation}
                    onClick={() => setShowTranslation((value) => !value)}
                    className="ml-auto text-xs font-semibold text-purple-600 dark:text-purple-300"
                  >
                    {showTranslation
                      ? "Ẩn nghĩa tiếng Việt"
                      : "Hiện nghĩa tiếng Việt"}
                  </button>
                </div>
              </div>
              {completed ? (
                <div className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-8 text-center dark:border-indigo-900 dark:bg-zinc-900">
                  <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
                  <h2 className="text-2xl font-extrabold">
                    Hoàn thành hội thoại!
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Khớp câu mẫu:{" "}
                    {
                      Object.values(answers).filter((value) => value.correct)
                        .length
                    }{" "}
                    / {Object.keys(answers).length} lượt của vai {role}.
                  </p>
                  <Button onClick={() => changeRole(role)}>
                    <RotateCcw className="size-4" />
                    Luyện lại
                  </Button>
                </div>
              ) : (
                <>
                  <ol aria-label="Nội dung hội thoại" className="space-y-3">
                    {output.turns
                      .slice(0, currentIndex + 1)
                      .map((line, index) => (
                        <li
                          key={index}
                          aria-current={
                            index === currentIndex ? "step" : undefined
                          }
                          className={`flex gap-3 ${line.role === "B" ? "flex-row-reverse" : ""}`}
                        >
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${line.role === role ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
                          >
                            {line.role}
                          </span>
                          <div
                            className={`max-w-[85%] space-y-2 rounded-2xl border p-4 ${line.role === role ? "border-indigo-500/20 bg-indigo-500/5" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}
                          >
                            <p className="text-sm font-semibold leading-relaxed">
                              {line.textEn}
                            </p>
                            {showTranslation && (
                              <p className="text-xs leading-relaxed text-zinc-500">
                                {line.textVi}
                              </p>
                            )}
                            <button
                              type="button"
                              aria-label={`Nghe câu ${index + 1}`}
                              onClick={() => {
                                if (
                                  !playEnglishSpeech(line.textEn, {
                                    voiceLang:
                                      line.role === "A" ? "en-US" : "en-GB",
                                    rate: 0.9,
                                  })
                                )
                                  setSpeechError(
                                    "Trình duyệt chưa hỗ trợ đọc thành tiếng.",
                                  );
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300"
                            >
                              <Volume2 className="size-3.5" />
                              Nghe câu này
                            </button>
                          </div>
                        </li>
                      ))}
                  </ol>
                  {ownTurn && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                      }}
                      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label
                          htmlFor="dialogue-answer"
                          className="inline-flex items-center gap-2 text-sm font-bold"
                        >
                          <Keyboard className="size-4 text-indigo-500" />
                          Lượt của bạn — vai {role}
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!!answer}
                          onClick={listen}
                        >
                          <Mic className="size-4" />
                          {listening ? "Dừng nghe" : "Nói câu này"}
                        </Button>
                      </div>
                      <input
                        id="dialogue-answer"
                        aria-label="Câu trả lời hội thoại"
                        autoComplete="off"
                        disabled={!!answer || listening}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Nói hoặc gõ lại câu tiếng Anh ở trên..."
                        className="w-full rounded-xl border border-zinc-300 bg-transparent p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700"
                      />
                      <p className="text-xs leading-relaxed text-zinc-500">
                        Kết quả là mức khớp câu tham khảo, không phải đánh giá
                        ngữ điệu hoặc chấm phát âm từng âm.
                      </p>
                      {!answer && (
                        <Button
                          type="submit"
                          disabled={listening || !text.trim()}
                        >
                          Kiểm tra câu trả lời
                        </Button>
                      )}
                      {answer && (
                        <p
                          role="status"
                          className={`rounded-xl p-3 text-sm ${answer.correct ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
                        >
                          {answer.correct
                            ? "Khớp câu mẫu!"
                            : `Chưa khớp câu mẫu. Tham khảo: ${turn?.textEn}`}
                        </p>
                      )}
                    </form>
                  )}
                  {speechError && (
                    <p
                      role="status"
                      className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
                    >
                      {speechError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button disabled={ownTurn && !answer} onClick={next}>
                      {currentIndex + 1 === output.turns.length
                        ? "Hoàn thành hội thoại"
                        : "Lượt tiếp theo"}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )
        )}
      </div>
    </AppShell>
  );
}
