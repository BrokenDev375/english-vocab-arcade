"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { LearningSet, VocabularyCard } from "@/contracts/vocabulary";
import {
  createGame,
  startGame,
  step,
  consumeText,
  backspace,
  unlockTarget,
  selectTarget,
  pause,
  resume,
  nextStage,
} from "@/features/arcade/engine";
import type {
  ArcadeCard,
  ArcadeGameState,
  ArcadeEvent,
  ArcadeMode,
} from "@/features/arcade/types";
import { ArcadeCanvas } from "./ArcadeCanvas";
import { useStudyIdentity } from "@/components/auth/AuthProvider";
import { useStudySession } from "@/features/study/use-study-session";
import { SyncNotice } from "@/components/study/SyncNotice";
import {
  Gamepad2,
  Zap,
  Brain,
  Heart,
  ArrowLeft,
  Info,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Trophy,
  RotateCcw,
  Sparkles,
  BookOpen,
  Keyboard,
  ArrowRight,
  AlertOctagon,
} from "lucide-react";

interface ArcadeClientProps {
  currentSet: LearningSet;
  cards: VocabularyCard[];
}

export const ArcadeClient: React.FC<ArcadeClientProps> = ({ currentSet, cards }) => {
  const identity = useStudyIdentity();
  const modeKey = `eva:v1:${identity.userId}:${currentSet.id}:arcade-mode`;
  const [selectedMode, setSelectedMode] = useState<ArcadeMode>(() => {
    if (typeof window === "undefined") return "typing";
    const requested = new URL(window.location.href).searchParams.get("mode");
    if (requested === "typing" || requested === "recall") return requested;
    try { return localStorage.getItem(modeKey) === "recall" ? "recall" : "typing"; } catch { return "typing"; }
  });
  useEffect(() => { try { localStorage.setItem(modeKey, selectedMode); } catch { /* Session sync reports storage failures. */ } }, [modeKey, selectedMode]);
  const chooseMode = (mode: ArcadeMode) => {
    const url = new URL(window.location.href); url.searchParams.set("mode", mode);
    window.history.replaceState(null, "", url); setSelectedMode(mode);
  };
  const [isGameActive, setIsGameActive] = useState(false);

  // Sound enabled
  const [isMuted, setIsMuted] = useState(false);

  // Map cards to ArcadeCard format
  const arcadeCards: ArcadeCard[] = useMemo(
    () =>
      cards.map((c) => ({
        id: c.id,
        term: c.term,
        meaningVi: c.meaningVi,
        acceptedAnswers: c.acceptedAnswers,
        ipa: c.ipa || undefined,
      })),
    [cards]
  );

  const cardLookup = useMemo(
    () => new Map(arcadeCards.map((c) => [c.id, c])),
    [arcadeCards]
  );

  // Arcade game state
  const [gameState, setGameState] = useState<ArcadeGameState>(() =>
    createGame(arcadeCards, { mode: selectedMode })
  );

  const [lastEvents, setLastEvents] = useState<ArcadeEvent[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isInputShaking, setIsInputShaking] = useState(false);


  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const gameRef = useRef(gameState);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);
  const lastAttemptTimeRef = useRef(0);
  const processedEvents = useRef(new Set<string>());
  const commit = useCallback((next: ArcadeGameState) => { gameRef.current = next; setGameState(next); }, []);
  const persistence = useStudySession(currentSet.id, selectedMode === "typing" ? "arcade_typing" : "arcade_recall", { gameState, isGameActive, lastAttemptTime }, v => {
    lastAttemptTimeRef.current = Number(v.lastAttemptTime) || 0; setLastAttemptTime(lastAttemptTimeRef.current);
    if (v.gameState) {
      const saved = v.gameState as ArcadeGameState;
      commit({ ...saved, phase: saved.phase === "running" ? "paused" : saved.phase });
      setIsGameActive(Boolean(v.isGameActive));
    }
  }, cards.length > 0, gameState.phase === "won" || gameState.phase === "lost" ? "completed" : gameState.phase === "paused" ? "paused" : "active");

  // Start game handler
  const handleStartGame = () => {
    if (!persistence.ready) return;
    void persistence.restart(() => {
      commit(startGame(createGame(arcadeCards, { mode: selectedMode, seed: persistence.newEventId() })));
      lastAttemptTimeRef.current = 0; setLastAttemptTime(0);
      processedEvents.current.clear(); setIsGameActive(true); setLastEvents([]); setInputVal("");
      setTimeout(() => inputRef.current?.focus(), 100);
    });
  };

  // Sound effect trigger (pure Web Audio API synth tones without external mp3 dependencies)
  const playSound = useCallback(
    (type: "hit" | "miss" | "wrong") => {
      if (isMuted || typeof window === "undefined" || !window.AudioContext) return;
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === "hit") {
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === "miss") {
          osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
          osc.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.25); // A2
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.25);
        } else if (type === "wrong") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(150, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.08);
        }
      } catch {
        // AudioContext not allowed or not ready
      }
    },
    [isMuted]
  );

  // Effects run only from event handlers/frame callbacks, outside React state updaters.
  const processEvents = useCallback((events: ArcadeEvent[]) => {
    for (const evt of events) {
      if (processedEvents.current.has(evt.id)) continue;
      processedEvents.current.add(evt.id);
      if (evt.type === "TARGET_HIT" || evt.type === "TARGET_MISSED") {
        const hit = evt.type === "TARGET_HIT";
        playSound(hit ? "hit" : "miss");
        const durationMs = Math.max(0, evt.timestampMs - lastAttemptTimeRef.current);
        lastAttemptTimeRef.current = evt.timestampMs; setLastAttemptTime(evt.timestampMs);
        persistence.record({ clientEventId: persistence.newEventId(), cardId: evt.payload?.cardId || "", mode: "arcade", questionType: selectedMode === "typing" ? "arcade_typing" : "arcade_recall", userAnswer: hit ? evt.payload?.canonicalAnswer || "" : "", isCorrect: hit, durationMs, answeredAt: new Date().toISOString() }, evt.id);
      } else if (evt.type === "WRONG_KEY") { playSound("wrong"); setIsInputShaking(true); setTimeout(() => setIsInputShaking(false), 300); }
    }
  }, [persistence, playSound, selectedMode]);

  // Engine step handler
  const handleStep = useCallback((deltaMs: number) => {
    if (!persistence.ready || gameRef.current.phase !== "running") return;
    const result = step(gameRef.current, deltaMs, cardLookup);
    commit(result.state);
    if (result.events.length) { setLastEvents(result.events); processEvents(result.events); }
  }, [cardLookup, commit, processEvents, persistence.ready]);

  // Input text change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);

    if (isComposingRef.current) return;

    if (val.length > 0) {
      const result = consumeText(gameRef.current, val);
      commit(result.state);
      if (result.events.length) { setLastEvents(result.events); processEvents(result.events); }

      // Clear input element so user can type cleanly
      setInputVal("");
    }
  };

  // Keyboard navigation & control keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      commit(backspace(gameRef.current));
    } else if (e.key === "Escape") {
      commit(unlockTarget(gameRef.current));
    }
  };

  // Canvas target selection
  const handleSelectTarget = (targetId: string) => {
    commit(selectTarget(gameRef.current, targetId));
    inputRef.current?.focus();
  };

  // Pause / Resume
  const handleTogglePause = () => {
    commit(gameRef.current.phase === "paused" ? resume(gameRef.current) : pause(gameRef.current));
  };

  const handleNextStage = () => {
    commit(nextStage(gameRef.current));
    inputRef.current?.focus();
  };

  // Speech pronunciation for missed words review
  const handlePronounce = (term: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(term);
    utt.lang = "en-US";
    window.speechSynthesis.speak(utt);
  };

  // Missed cards for review
  const missedCards = cards.filter((c) => gameState.missedIds.includes(c.id));
  const unreachedCards = cards.filter(
    (c) =>
      !gameState.hitIds.includes(c.id) &&
      !gameState.missedIds.includes(c.id) &&
      gameState.phase === "lost"
  );

  if (!persistence.ready) return <div><SyncNotice message={persistence.error} ready={false} retry={persistence.retry} /><p>Đang khôi phục trò chơi...</p></div>;

  // 1. LANDING & MODE SELECTION SCREEN
  if (!isGameActive) {
    return (
      <div className="space-y-6">
        <SyncNotice message={persistence.error} ready={persistence.ready} retry={persistence.retry} />
        <div className="flex items-center justify-between">
          <Link
            href={`/sets/${currentSet.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại chi tiết bộ từ</span>
          </Link>

          <Badge variant="amber" size="sm">
            Word Blaster Arcade
          </Badge>
        </div>

        <div className="max-w-3xl mx-auto space-y-8 py-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
              Word Blaster
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
              Bắn hạ các từ vựng đang rơi bằng cách gõ chính xác từ khóa trước khi chạm đáy màn hình!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => chooseMode("typing")}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedMode === "typing"
                  ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 shadow-md"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Chế độ 1: Luyện gõ phản xạ
                  </h3>
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                    Nhìn từ tiếng Anh → Gõ nhanh
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Từ tiếng Anh xuất hiện trên mục tiêu bay. Rèn luyện sự quen thuộc mặt chữ và tốc độ gõ phím chuẩn xác.
              </p>
            </div>

            <div
              onClick={() => chooseMode("recall")}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedMode === "recall"
                  ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Chế độ 2: Tự nhớ từ vựng
                  </h3>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Nhìn nghĩa tiếng Việt → Nhớ từ Anh
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Mục tiêu chỉ hiển thị nghĩa tiếng Việt. Buộc não bộ chủ động nhớ lại từ vựng tiếng Anh tương ứng để gõ.
              </p>
            </div>
          </div>

          <div className="p-4.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-200">
              <Info className="w-4 h-4 text-teal-500" />
              <span>Quy tắc trò chơi</span>
            </div>
            <ul className="list-disc list-inside space-y-1">
              <li>Bạn có <strong>3 mạng</strong>. Để từ chạm đáy sẽ bị trừ 1 mạng.</li>
              <li>Gõ đúng càng nhanh ở nửa trên màn hình sẽ nhận được <strong>Speed Bonus</strong> lên tới +40 điểm.</li>
              <li>Gõ sai chữ không bị trừ mạng và không làm tăng tốc độ rơi.</li>
              <li>Không lặp từ giữa các chặng trong một lượt chơi; từ trượt sẽ có danh sách ôn tập riêng.</li>
            </ul>
          </div>

          <div className="text-center pt-2">
            <Button
              variant="amber"
              size="lg"
              onClick={handleStartGame}
              className="w-full sm:w-64 shadow-xl shadow-amber-500/25 cursor-pointer"
            >
              <Gamepad2 className="w-5 h-5 mr-2" />
              Bắt đầu chơi ngay
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE GAMEPLAY & ARENA
  const isTerminal = gameState.phase === "won" || gameState.phase === "lost";

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
        <SyncNotice message={persistence.error} ready={persistence.ready} retry={persistence.retry} />
      {/* Top HUD */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-lg">
        {/* Lives */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-rose-400 font-bold text-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${
                  i < gameState.lives ? "fill-rose-500 text-rose-500" : "text-zinc-700"
                }`}
              />
            ))}
            <span className="ml-1 text-xs">{gameState.lives}/3</span>
          </div>

          <Badge variant={selectedMode === "typing" ? "teal" : "amber"} size="sm">
            {selectedMode === "typing" ? "Luyện gõ" : "Tự nhớ"}
          </Badge>
        </div>

        {/* Stats & Controls */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <span className="text-[10px] uppercase text-zinc-400 block">Chặng</span>
            <span className="text-sm font-bold text-teal-400">
              {gameState.stageIndex + 1} / {Math.ceil(gameState.orderedCardIds.length / 10) || 1}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase text-zinc-400 block">Điểm số</span>
            <span className="text-lg sm:text-xl font-black text-amber-400">
              {gameState.score}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleTogglePause}
              disabled={isTerminal}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40"
              title={gameState.phase === "paused" ? "Tiếp tục" : "Tạm dừng"}
            >
              {gameState.phase === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Overlays */}
      <div className="relative">
        <ArcadeCanvas
          gameState={gameState}
          onStep={handleStep}
          onSelectTarget={handleSelectTarget}
          onAutoPause={() => commit(pause(gameRef.current))}
          lastEvents={lastEvents}
        />

        {/* PAUSED MODAL OVERLAY */}
        {gameState.phase === "paused" && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-3xl z-20 animate-in fade-in">
            <Card className="p-8 text-center max-w-sm w-full space-y-4 shadow-2xl border-2 border-teal-500/40">
              <Pause className="w-10 h-10 mx-auto text-teal-500" />
              <h3 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Tạm dừng</h3>
              <p className="text-xs text-zinc-500">
                Trò chơi đang dừng. Vị trí các từ vựng và thời gian bay được bảo toàn.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={handleTogglePause}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-1.5" />
                Tiếp tục chơi
              </Button>
            </Card>
          </div>
        )}

        {/* STAGE CLEARED MODAL OVERLAY */}
        {gameState.phase === "stage_complete" && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-3xl z-20 animate-in zoom-in-95">
            <Card className="p-8 text-center max-w-md w-full space-y-5 shadow-2xl border-2 border-teal-500/60 bg-gradient-to-b from-teal-50/40 via-white to-zinc-50 dark:from-teal-950/30 dark:via-zinc-900 dark:to-zinc-900">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">
                  Hoàn thành chặng {gameState.stageIndex + 1}!
                </h3>
                <p className="text-xs text-zinc-500">
                  Bạn đã bảo vệ căn cứ thành công. Hãy sẵn sàng cho chặng tiếp theo với tốc độ thử thách hơn!
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleNextStage}
                className="w-full shadow-lg"
              >
                <span>Bắt đầu chặng {gameState.stageIndex + 2}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Card>
          </div>
        )}

        {/* GAME OVER / VICTORY RESULTS MODAL */}
        {isTerminal && (
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 rounded-3xl z-30 overflow-y-auto animate-in zoom-in-95">
            <Card className="p-6 sm:p-8 text-center max-w-xl w-full my-auto space-y-5 shadow-2xl border-2 border-zinc-800 bg-zinc-900 text-zinc-100">
              <div
                className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center shadow-inner ${
                  gameState.phase === "won"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {gameState.phase === "won" ? (
                  <Trophy className="w-8 h-8" />
                ) : (
                  <AlertOctagon className="w-8 h-8" />
                )}
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {gameState.phase === "won" ? "Chiến thắng vẻ vang!" : "Trận chiến kết thúc"}
                </h2>
                <p className="text-xs text-zinc-400">
                  {gameState.phase === "won"
                    ? `Bạn đã hoàn thành toàn bộ ${gameState.orderedCardIds.length} từ vựng!`
                    : "Căn cứ đã bị các từ vựng xuyên thủng. Hãy cùng ôn lại các từ chưa kịp bắn hạ!"}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 py-1">
                <div className="p-3 rounded-2xl bg-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 uppercase block">Tổng điểm</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                    {gameState.score}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 uppercase block">Bắn trúng</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400">
                    {gameState.hitIds.length}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-800/80">
                  <span className="text-[10px] text-zinc-400 uppercase block">Trượt</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-400">
                    {gameState.missedIds.length}
                  </span>
                </div>
              </div>

              {/* Review Missed Words */}
              {missedCards.length > 0 && (
                <div className="text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>Các từ bị trượt cần lưu ý ({missedCards.length})</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-800">
                    {missedCards.map((c) => (
                      <div key={c.id} className="pt-1.5 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-white mr-2">{c.term}</strong>
                          {c.ipa && <span className="text-zinc-500 font-mono mr-2">{c.ipa}</span>}
                          <span className="text-zinc-400">{c.meaningVi}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePronounce(c.term)}
                          className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-teal-400"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unreached Words Notice if lost early */}
              {unreachedCards.length > 0 && (
                <p className="text-[11px] text-zinc-400 text-left">
                  Còn {unreachedCards.length} từ chưa xuất hiện trong các chặng tiếp theo.
                </p>
              )}

              {/* Persistence Notice */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-800/40 p-2 rounded-xl">
                <Info className="w-3.5 h-3.5 shrink-0 text-teal-400" />
                <span>Tiến độ được lưu trên máy và đồng bộ khi bạn đăng nhập.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="amber"
                  size="md"
                  onClick={handleStartGame}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Chơi lại từ đầu
                </Button>

                <Link href={`/sets/${currentSet.id}`} className="w-full">
                  <Button variant="outline" size="md" className="w-full border-zinc-700 text-zinc-300">
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    Quay lại học phần
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Input Typing Bridge Bar */}
      <div
        className={`p-3 rounded-2xl bg-zinc-900 border-2 transition-all flex items-center gap-3 ${
          isInputShaking ? "border-rose-500 animate-shake" : "border-zinc-800 focus-within:border-teal-500"
        }`}
      >
        <div className="p-2 rounded-xl bg-zinc-800 text-teal-400">
          <Keyboard className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          autoFocus
          disabled={isTerminal || gameState.phase === "paused"}
          value={inputVal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            handleInputChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
          }}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            gameState.lockedTargetId
              ? `Đang gõ mục tiêu... (Buffer: "${gameState.typedBuffer}")`
              : "Gõ chữ cái đầu tiên của từ đang rơi để khóa mục tiêu..."
          }
          className="flex-1 bg-transparent text-sm sm:text-base font-bold text-white placeholder:text-zinc-500 focus:outline-none"
        />

        {gameState.lockedTargetId && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950/60 border border-teal-500/30 px-2.5 py-1 rounded-lg">
              {gameState.typedBuffer}
            </span>
            <button
              type="button"
              onClick={() => commit(unlockTarget(gameRef.current))}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
            >
              Hủy khóa (Esc)
            </button>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.focus()}
          className="text-xs border-zinc-700 text-zinc-300 sm:hidden"
        >
          Bật phím
        </Button>
      </div>
    </div>
  );
};
