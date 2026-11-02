"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionCard } from "./QuestionCard";
import { StudyResults } from "./StudyResults";
import { SyncNotice } from "./SyncNotice";
import { StudyHeader } from "./StudyHeader";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { fetchAllSetCards, isDemoSetId } from "@/features/sets/sets-client";
import { generateSessionPlan, generateErrorReviewPlan, type StudyCard, type StudyQuestion } from "@/features/study/question-engine";
import { useStudySession } from "@/features/study/use-study-session";

export function VocabularyPractice({ mode }: { mode: "learn" | "test" }) {
  const { id } = useParams<{ id: string }>();
  const [pool, setPool] = useState<StudyCard[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [failedCards, setFailedCards] = useState<StudyCard[]>([]);
  const [stage, setStage] = useState("main");
  const [answers, setAnswers] = useState<Record<string, { text: string; correct: boolean }>>({});
  const reset = (cards: StudyCard[]) => {
    setQuestions(generateSessionPlan(cards, mode === "test" ? { allowedTypes: ["multiple_choice", "type_in"] } : {}).mainQuestions);
    setCurrentIndex(0); setCorrectCount(0); setFailedCards([]); setAnswers({}); setStage("main");
  };
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const cards = await fetchAllSetCards(id);
        if (!cards.length) throw new Error("Học phần chưa có thẻ để học.");
        const studyCards: StudyCard[] = cards.map(c => ({ ...c, ipa: c.ipa || undefined, partOfSpeech: c.partOfSpeech || undefined, exampleEn: c.exampleEn || undefined, exampleVi: c.exampleVi || undefined }));
        let loadedTitle = "Học phần mẫu";
        if (!isDemoSetId(id)) {
          const response = await fetch(`/api/sets/${id}`);
          if (!response.ok) throw new Error("Không tìm thấy học phần hoặc bạn không có quyền truy cập.");
          loadedTitle = (await response.json()).data.title;
        }
        if (!mounted) return;
        setPool(studyCards); setTitle(loadedTitle);
        setQuestions(generateSessionPlan(studyCards, mode === "test" ? { allowedTypes: ["multiple_choice", "type_in"] } : {}).mainQuestions);
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : "Không tải được học phần."); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id, mode]);
  const persistence = useStudySession(id, mode, { pool, questions, currentIndex, correctCount, failedCards, stage, answers }, value => {
    if (!Array.isArray(value.questions)) return;
    setPool(value.pool as StudyCard[]); setQuestions(value.questions as StudyQuestion[]);
    setCurrentIndex(Number(value.currentIndex) || 0); setCorrectCount(Number(value.correctCount) || 0);
    setFailedCards((value.failedCards || []) as StudyCard[]); setStage(String(value.stage || "main"));
    setAnswers((value.answers || {}) as typeof answers);
  }, !loading && !error && pool.length > 0, stage === "results" ? "completed" : "active");
  const current = questions[currentIndex];
  const answer = current ? answers[current.id] : undefined;
  const onAnswer = (correct: boolean, text: string, durationMs: number) => {
    if (!current || answers[current.id] || !persistence.ready) return;
    setAnswers(prev => ({ ...prev, [current.id]: { text, correct } }));
    if (correct) setCorrectCount(v => v + 1);
    else { const card = pool.find(c => c.id === current.cardId); if (card) setFailedCards(prev => prev.some(c => c.id === card.id) ? prev : [...prev, card]); }
    persistence.record({ clientEventId: persistence.newEventId(), cardId: current.cardId, mode, questionType: current.type, userAnswer: text, isCorrect: correct, durationMs, answeredAt: new Date().toISOString() }, current.id);
  };
  const reviewErrors = () => { void persistence.restart(() => { setQuestions(generateErrorReviewPlan(failedCards, pool).mainQuestions); setAnswers({}); setCurrentIndex(0); setCorrectCount(0); setStage("error_review"); }); };
  return <AppShell showDemoBanner={isDemoSetId(id)}>
    <SyncNotice message={persistence.error} ready={persistence.ready} retry={persistence.retry} />
    {error ? <><ErrorAlert message={error} /><Button onClick={() => window.location.reload()}>Thử lại</Button></> : loading || !persistence.ready ? <LoadingState message="Đang mở phiên học..." /> : <div className="mx-auto max-w-3xl space-y-6">
      <StudyHeader setId={id} title={mode === "learn" ? "Chế độ Học" : "Kiểm tra"} subtitle={title} current={stage === "results" ? questions.length : currentIndex + 1} total={questions.length} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold"><span className="rounded-full bg-indigo-500/10 px-3 py-1.5 text-indigo-600 dark:text-indigo-300">{stage === "error_review" ? "Ôn lại các từ trả lời sai" : mode === "learn" ? "Luyện từ vựng và ôn lỗi" : "Kiểm tra vốn từ của bạn"}</span><span className="text-zinc-500">Đúng {correctCount} / {Object.keys(answers).length} câu đã trả lời</span></div>
      {stage === "results" ? <StudyResults setId={id} totalQuestions={questions.length} correctCount={correctCount} failedCards={failedCards} modeName={mode === "learn" ? "Học thích ứng" : "Kiểm tra"} onRestart={() => { void persistence.restart(() => reset(pool)); }} onStartErrorReview={failedCards.length ? reviewErrors : undefined} /> : current && <>
        {answer ? <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-bold text-zinc-400">Câu {currentIndex + 1}/{questions.length}</p><h2 className="text-center text-2xl font-extrabold">{current.prompt}</h2><p className="text-center text-sm text-zinc-500">Bạn trả lời: {answer.text}</p><div role="status" className={`flex items-start gap-3 rounded-xl p-4 ${answer.correct ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{answer.correct ? <CheckCircle2 className="size-5 shrink-0" /> : <XCircle className="size-5 shrink-0" />}<div><p className="font-bold">{answer.correct ? "Chính xác" : `Đáp án: ${current.correctAnswer}`}</p>{current.explanation && <p className="mt-2 text-sm text-zinc-500">{current.explanation}</p>}</div></div></div> : <QuestionCard key={current.id} question={current} questionNumber={currentIndex + 1} totalQuestions={questions.length} onAnswer={onAnswer} />}
        <div className="flex justify-end"><Button disabled={!answer} onClick={() => currentIndex + 1 < questions.length ? setCurrentIndex(v => v + 1) : setStage("results")}>{currentIndex + 1 < questions.length ? "Câu tiếp theo" : "Xem kết quả"}</Button></div>
      </>}
    </div>}
  </AppShell>;
}
