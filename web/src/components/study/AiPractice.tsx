"use client";
import { useElapsedTime } from "@/features/study/use-elapsed-time";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { LoadingState } from "@/components/ui/LoadingState";
import { SyncNotice } from "./SyncNotice";
import { useStudySession } from "@/features/study/use-study-session";
import { fetchAllSetCards, isDemoSetId } from "@/features/sets/sets-client";
import { requestAiBatch } from "@/features/ai/ai-client";
import type { GrammarOutput, ReadingOutput, TranslationOutput } from "@/features/ai/schemas";
import { DEMO_GRAMMAR_EXERCISES, DEMO_READING_EXERCISE, DEMO_TRANSLATION_EXERCISES } from "@/data/demo/exercises.demo";
import { normalizeAnswerText, shuffleWithSeed } from "@/features/study/engine";

type Output = GrammarOutput | ReadingOutput | TranslationOutput;
export function AiPractice({ mode }: { mode: "grammar" | "reading" | "translation" }) {
  const { id } = useParams<{ id: string }>();
  const [output, setOutput] = useState<Output | null>(null);
  const [batchId, setBatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { text: string; correct: boolean }>>({});
  const [text, setText] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<number[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        if (isDemoSetId(id)) { setOutput(mode === "grammar" ? DEMO_GRAMMAR_EXERCISES : mode === "reading" ? DEMO_READING_EXERCISE : DEMO_TRANSLATION_EXERCISES); setBatchId("demo"); return; }
        const cards = await fetchAllSetCards(id);
        if (!cards.length) throw new Error("Học phần chưa có từ để tạo bài tập.");
        const result = await requestAiBatch<Output>(id, mode, cards.slice(0, mode === "grammar" ? 6 : 10).map(c => c.id), controller.signal);
        if (!controller.signal.aborted) { setOutput(result.output); setBatchId(result.batchId); }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Không tạo được bài tập."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [id, mode]);
  const reading = mode === "reading" ? output as ReadingOutput | null : null;
  const grammar = mode === "grammar" ? (output as GrammarOutput | null)?.exercises[currentIndex] : null;
  const translation = mode === "translation" ? (output as TranslationOutput | null)?.exercises[currentIndex] : null;
  const question = reading?.questions[currentIndex];
  const total = reading ? reading.questions.length : (output as GrammarOutput | TranslationOutput | null)?.exercises.length || 0;
  const answer = answers[currentIndex];
  const completed = total > 0 && Object.keys(answers).length === total;
  const sync = useStudySession(id, mode === "translation" ? "translate" : mode, { output, batchId, currentIndex, answers, text, selectedTokens }, value => {
    if (value.output) setOutput(value.output as Output);
    if (value.batchId) setBatchId(String(value.batchId));
    setCurrentIndex(Number(value.currentIndex) || 0); setAnswers((value.answers || {}) as typeof answers);
    setText(String(value.text || "")); setSelectedTokens((value.selectedTokens || []) as number[]);
  }, !loading && !error && !!output, completed ? "completed" : "active");
  const elapsedTime = useElapsedTime(currentIndex, sync.ready);
  const tokens = useMemo(() => grammar ? shuffleWithSeed(grammar.tokens.map((word, index) => ({ word, index })), `${batchId}:${currentIndex}`) : [], [grammar, batchId, currentIndex]);
  const submit = (submitted: string) => {
    if (answer || !sync.ready) return;
    let correct = false;
    if (grammar) correct = [grammar.tokens, ...grammar.acceptedTokenOrders].some(order => order.join(" ") === submitted) || grammar.sentenceEn === submitted;
    if (translation) correct = [translation.referenceEn, ...translation.acceptedAnswers].some(reference => normalizeAnswerText(reference) === normalizeAnswerText(submitted));
    if (question) correct = String(question.correctIndex) === submitted;
    const cardId = grammar?.cardId || translation?.cardId || reading?.usedCardIds[0];
    if (!cardId) return;
    setAnswers(v => ({ ...v, [currentIndex]: { text: submitted, correct } }));
    sync.record({ clientEventId: sync.newEventId(), cardId, mode: "learn", questionType: grammar ? "scramble" : question ? "multiple_choice" : "type_in", userAnswer: submitted, isCorrect: correct, durationMs: elapsedTime(), answeredAt: new Date().toISOString() }, `ai:${batchId}:${currentIndex}`);
  };
  const label = mode === "grammar" ? "Sắp xếp câu" : mode === "reading" ? "Đọc hiểu" : "Dịch theo ngữ cảnh";
  return <AppShell><SyncNotice message={sync.error} ready={sync.ready} retry={sync.retry} />
    {error ? <><ErrorAlert message={error} /><Button onClick={() => window.location.reload()}>Thử lại</Button><Link href={`/sets/${id}`}> Quay lại học phần</Link></> : loading || !sync.ready ? <LoadingState message="Đang chuẩn bị và khôi phục bài tập..." /> : <div className="max-w-3xl mx-auto space-y-5">
      <Link href={`/sets/${id}`}>← Quay lại học phần</Link><h1 className="text-2xl font-bold">{label}</h1>
      {batchId === "demo" && <p>Đây là bài tập mẫu.</p>}
      <p>Câu {currentIndex + 1}/{total} · Đúng {Object.values(answers).filter(v => v.correct).length}/{total}</p>
      {reading && <article className="rounded-xl border p-5 space-y-3"><h2 className="font-bold">{reading.title}</h2><p>{reading.passageEn}</p><details><summary>Xem bản dịch tham khảo</summary>{reading.translationVi}</details></article>}
      {grammar && <><p>{grammar.sentenceVi}</p><div className="flex gap-2 flex-wrap min-h-12 rounded-xl border p-3">{selectedTokens.map((index, i) => <button disabled={!!answer} key={`${index}-${i}`} onClick={() => setSelectedTokens(v => v.filter((_, n) => n !== i))}>{grammar.tokens[index]}</button>)}</div><div className="flex flex-wrap gap-2">{tokens.filter(token => !selectedTokens.includes(token.index)).map(token => <Button variant="outline" disabled={!!answer} key={token.index} onClick={() => setSelectedTokens(v => [...v, token.index])}>{token.word}</Button>)}</div><Button disabled={!!answer || !selectedTokens.length} onClick={() => submit(selectedTokens.map(index => grammar.tokens[index]).join(" "))}>Kiểm tra</Button><details><summary>Gợi ý</summary>{grammar.hintVi}</details></>}
      {translation && <><p>{translation.promptVi}</p><form onSubmit={e => { e.preventDefault(); submit(text); }} className="space-y-3"><input aria-label="Bản dịch tiếng Anh" className="w-full rounded-xl border p-3 bg-transparent" disabled={!!answer} value={text} onChange={e => setText(e.target.value)} /><Button disabled={!!answer || !text.trim()} type="submit">Kiểm tra</Button></form><p className="text-xs">Kết quả thể hiện mức khớp đáp án tham chiếu; các cách dịch khác vẫn có thể đúng.</p><details><summary>Gợi ý từ</summary>{translation.hints.map(h => <p key={h.word}>{h.word}: {h.meaningVi}</p>)}</details></>}
      {question && <><h2>{question.questionEn}</h2><div className="grid gap-2">{question.options.map((option, i) => <Button variant="outline" disabled={!!answer} key={i} onClick={() => submit(String(i))}>{option}</Button>)}</div></>}
      {answer && <div role="status" className="rounded-xl border p-4"><p>{answer.correct ? "Chính xác" : "Chưa khớp đáp án"}</p><p>{grammar?.sentenceEn || translation?.referenceEn || question?.options[question.correctIndex]}</p><p>{grammar?.explanationVi || translation?.explanationVi || question?.explanationVi}</p></div>}
      {answer && currentIndex + 1 < total && <Button onClick={() => { setCurrentIndex(v => v + 1); setText(""); setSelectedTokens([]); }}>Câu tiếp theo</Button>}
      {completed && <><p>Đã hoàn thành bài tập.</p><Button onClick={() => { void sync.restart(() => { setAnswers({}); setCurrentIndex(0); setText(""); setSelectedTokens([]); }); }}>Làm lại</Button></>}
    </div>}
  </AppShell>;
}
