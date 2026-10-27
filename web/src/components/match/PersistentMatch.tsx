"use client";
import { useElapsedTime } from "@/features/study/use-elapsed-time";

import { useState } from "react";
import { createMatchPlan, checkMatch, type MatchCard, type MatchSessionPlan, type MatchTile } from "@/features/match/engine";
import { useStudySession } from "@/features/study/use-study-session";
import { SyncNotice } from "@/components/study/SyncNotice";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export function PersistentMatch({ setId, setTitle, cards }: { setId: string; setTitle: string; cards: MatchCard[] }) {
  const [plan, setPlan] = useState(() => createMatchPlan(cards));
  const [stageIndex, setStageIndex] = useState(0);
  const [matched, setMatched] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("");
  const [paused, setPaused] = useState(false);
  const finished = stageIndex >= plan.stages.length;
  const sync = useStudySession(setId, "match", { plan, stageIndex, matched, mistakes, paused }, v => {
    if (v.plan) setPlan(v.plan as MatchSessionPlan);
    setStageIndex(Number(v.stageIndex) || 0); setMatched((v.matched || []) as string[]); setMistakes(Number(v.mistakes) || 0); setPaused(Boolean(v.paused));
  }, cards.length > 0, finished ? "completed" : paused ? "paused" : "active");
  const elapsedTime = useElapsedTime(`${stageIndex}:${matched.length}`, sync.ready && !paused);
  const stage = plan.stages[stageIndex];
  const choose = (tile: MatchTile) => {
    if (!stage || paused || matched.includes(tile.id)) return;
    const first = stage.tiles.find(t => t.id === selected);
    if (!first || first.id === tile.id || first.type === tile.type) { setSelected(tile.id); return; }
    const correct = checkMatch(first, tile, stage.cards);
    setSelected(null); setMessage(correct ? "Ghép đúng!" : "Chưa đúng, hãy thử lại.");
    if (!correct) { setMistakes(v => v + 1); return; }
    setMatched(v => [...v, first.id, tile.id]);
    const card = stage.cards.find(c => c.id === first.cardId)!;
    sync.record({ clientEventId: sync.newEventId(), cardId: card.id, mode: "match", questionType: "match", userAnswer: card.term, isCorrect: true, durationMs: elapsedTime(), answeredAt: new Date().toISOString() });
  };
  return <div className="space-y-5"><SyncNotice message={sync.error} ready={sync.ready} retry={sync.retry} />
    {!sync.ready ? <LoadingState message="Đang khôi phục phiên ghép thẻ..." /> : <>
      <h1 className="text-xl font-bold">Ghép thẻ: {setTitle}</h1><p>Chặng {Math.min(stageIndex + 1, plan.stages.length)}/{plan.stages.length} · {plan.totalPairs} từ · {mistakes} lần ghép sai</p>
      {finished ? <><p>Đã hoàn thành tất cả các chặng!</p><Button onClick={() => { void sync.restart(() => { setPlan(createMatchPlan(cards)); setStageIndex(0); setMatched([]); setMistakes(0); setPaused(false); }); }}>Chơi lại</Button></> : <>
        <Button variant="outline" onClick={() => setPaused(v => !v)}>{paused ? "Tiếp tục" : "Tạm dừng"}</Button>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{stage.tiles.map(tile => <button key={tile.id} disabled={paused || matched.includes(tile.id)} onClick={() => choose(tile)} className={`min-h-24 rounded-xl border p-4 disabled:opacity-30 ${selected === tile.id ? "border-teal-500 bg-teal-500/10" : "border-zinc-400"}`}>{tile.text}</button>)}</div>
        <p role="status">{message}</p>
        {stage.tiles.every(t => matched.includes(t.id)) && <Button onClick={() => { setStageIndex(v => v + 1); setSelected(null); setMatched([]); setMessage(""); }}>{stageIndex + 1 === plan.stages.length ? "Hoàn thành" : "Chặng tiếp theo"}</Button>}
      </>}
    </>}
  </div>;
}
