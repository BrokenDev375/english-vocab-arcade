"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { QuestionCard } from "./QuestionCard";
import { StudyResults } from "./StudyResults";
import { SyncNotice } from "./SyncNotice";
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
  return <AppShell>
    <SyncNotice message={persistence.error} ready={persistence.ready} retry={persistence.retry} />
    {error ? <><ErrorAlert message={error} /><Button onClick={() => window.location.reload()}>Thử lại</Button></> : loading || !persistence.ready ? <LoadingState message="Đang mở phiên học..." /> : <div className="space-y-5">
      <Link href={`/sets/${id}`}>← Quay lại học phần</Link><h1 className="text-xl font-bold">{mode === "learn" ? "Học thích ứng" : "Kiểm tra"}: {title}</h1>
      {stage === "error_review" && <p>Ôn lại các từ trả lời sai</p>}
      {stage === "results" ? <StudyResults setId={id} totalQuestions={questions.length} correctCount={correctCount} failedCards={failedCards} modeName={mode === "learn" ? "Học thích ứng" : "Kiểm tra"} onRestart={() => { void persistence.restart(() => reset(pool)); }} onStartErrorReview={failedCards.length ? reviewErrors : undefined} /> : current && <>
        {answer ? <div className="mx-auto max-w-2xl rounded-xl border p-6 space-y-3"><p>Câu {currentIndex + 1}/{questions.length}: {current.prompt}</p><p>Bạn trả lời: {answer.text}</p><p>{answer.correct ? "Chính xác" : `Đáp án: ${current.correctAnswer}`}</p></div> : <QuestionCard key={current.id} question={current} questionNumber={currentIndex + 1} totalQuestions={questions.length} onAnswer={onAnswer} />}
        <div className="flex justify-end"><Button disabled={!answer} onClick={() => currentIndex + 1 < questions.length ? setCurrentIndex(v => v + 1) : setStage("results")}>{currentIndex + 1 < questions.length ? "Câu tiếp theo" : "Xem kết quả"}</Button></div>
      </>}
    </div>}
  </AppShell>;
}
