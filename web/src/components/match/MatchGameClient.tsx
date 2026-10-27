"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  createMatchPlan,
  checkMatch,
  type MatchCard,
  type MatchTile,
  type MatchStage,
} from "@/features/match/engine";
import {
  recordLocalAttempt,
  generateClientEventId,
  initServerSession,
  sendServerAttempt,
} from "@/features/study/study-client-adapter";
import {
  ArrowLeft,
  Clock,
  Trophy,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Info,
  Pause,
  Play,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface MatchGameClientProps {
  setId: string;
  setTitle: string;
  cards: MatchCard[];
}

function getNow(): number {
  return typeof Date !== "undefined" ? Date.now() : 0;
}

interface MatchBoardProps {
  stage: MatchStage;
  setId: string;
  sessionId: string;
  serverSessionRef: React.MutableRefObject<{ sessionId: string; version: number } | null>;
  onMismatch: () => void;
  onStageClear: () => void;
  isPaused: boolean;
}

function MatchBoard({
  stage,
  setId,
  sessionId,
  serverSessionRef,
  onMismatch,
  onStageClear,
  isPaused,
}: MatchBoardProps) {
  // Initialize tile states from the stage directly (no useEffect needed)
  const [tileStates, setTileStates] = useState<Record<string, "idle" | "selected" | "matched" | "wrong">>(() => {
    const initial: Record<string, "idle" | "selected" | "matched" | "wrong"> = {};
    for (const t of stage.tiles) {
      initial[t.id] = "idle";
    }
    return initial;
  });

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = getNow();
  }, []);

  const handleTileClick = (clickedTile: MatchTile) => {
    if (isProcessing || isPaused) return;

    const currentState = tileStates[clickedTile.id];
    if (currentState === "matched" || currentState === "wrong") return;

    // Deselect if clicking the same tile
    if (selectedTileId === clickedTile.id) {
      setSelectedTileId(null);
      setTileStates((prev) => ({ ...prev, [clickedTile.id]: "idle" }));
      return;
    }

    // First tile selected
    if (!selectedTileId) {
      setSelectedTileId(clickedTile.id);
      setTileStates((prev) => ({ ...prev, [clickedTile.id]: "selected" }));
      return;
    }

    // Second tile selected
    const firstTile = stage.tiles.find((t) => t.id === selectedTileId);
    if (!firstTile) return;

    // Cannot match identical types (e.g. both terms or both meanings)
    if (firstTile.type === clickedTile.type) {
      setTileStates((prev) => ({
        ...prev,
        [selectedTileId]: "idle",
        [clickedTile.id]: "selected",
      }));
      setSelectedTileId(clickedTile.id);
      return;
    }

    setIsProcessing(true);
    const isCorrect = checkMatch(firstTile, clickedTile, stage.cards);

    if (isCorrect) {
      const updatedStates = {
        ...tileStates,
        [firstTile.id]: "matched" as const,
        [clickedTile.id]: "matched" as const,
      };
      setTileStates(updatedStates);
      setSelectedTileId(null);
      setIsProcessing(false);

      const now = getNow();
      const elapsed = startTimeRef.current > 0 ? now - startTimeRef.current : 0;
      const clientEventId = generateClientEventId();
      const effectiveSessionId = serverSessionRef.current?.sessionId || sessionId;

      const targetCard = stage.cards.find((c) => c.id === firstTile.cardId);
      const answerText = targetCard
        ? targetCard.term
        : firstTile.type === "term"
        ? firstTile.text
        : clickedTile.text;

      // Persistently record attempt
      recordLocalAttempt({
        clientEventId,
        sessionId: effectiveSessionId,
        setId,
        cardId: firstTile.cardId,
        mode: "match",
        questionType: "match",
        userAnswer: answerText,
        isCorrect: true,
        durationMs: Math.max(0, elapsed),
        answeredAt: new Date(now).toISOString(),
      });

      if (serverSessionRef.current) {
        const currentSess = serverSessionRef.current;
        void sendServerAttempt({
          sessionId: currentSess.sessionId,
          cardId: firstTile.cardId,
          clientEventId,
          questionKey: `match_${firstTile.cardId}`,
          attemptKind: "answer",
          answerText,
          activeElapsedMs: Math.max(0, elapsed),
          expectedVersion: currentSess.version,
        }).then((res) => {
          if (res?.newVersion && serverSessionRef.current) {
            serverSessionRef.current.version = res.newVersion;
          }
        });
      }

      // Check if all tiles in this stage are matched
      const allMatched = stage.tiles.every((t) => updatedStates[t.id] === "matched");
      if (allMatched) {
        onStageClear();
      }
    } else {
      onMismatch();
      setTileStates((prev) => ({
        ...prev,
        [firstTile.id]: "wrong",
        [clickedTile.id]: "wrong",
      }));

      setTimeout(() => {
        setTileStates((prev) => ({
          ...prev,
          [firstTile.id]: "idle",
          [clickedTile.id]: "idle",
        }));
        setSelectedTileId(null);
        setIsProcessing(false);
      }, 550);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto pt-2">
      {stage.tiles.map((tile) => {
        const state = tileStates[tile.id] || "idle";

        let tileClasses =
          "p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-24 sm:min-h-28 shadow-sm select-none ";

        if (state === "matched") {
          tileClasses +=
            "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 opacity-40 cursor-default scale-95 pointer-events-none";
        } else if (state === "wrong") {
          tileClasses +=
            "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 animate-shake";
        } else if (state === "selected") {
          tileClasses +=
            "border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 shadow-md ring-2 ring-teal-500/30 scale-102";
        } else {
          tileClasses +=
            "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-teal-400 hover:shadow-md text-zinc-900 dark:text-zinc-100";
        }

        return (
          <button
            key={tile.id}
            type="button"
            disabled={state === "matched" || isProcessing || isPaused}
            onClick={() => handleTileClick(tile)}
            className={tileClasses}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              {tile.type === "term" ? "Tiếng Anh" : "Tiếng Việt"}
            </span>
            <span className="text-sm sm:text-base font-extrabold leading-snug">
              {tile.text}
            </span>
            {state === "matched" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function MatchGameClient({ setId, setTitle, cards }: MatchGameClientProps) {
  const [plan, setPlan] = useState(() => createMatchPlan(cards));
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  // Active playing timer (in seconds) - only counts during active gameplay
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isStageCleared, setIsStageCleared] = useState(false);
  const [isGameFinished, setIsGameFinished] = useState(false);

  // Stats
  const [mismatchCount, setMismatchCount] = useState(0);
  const [sessionId] = useState(() => "session_match_" + Math.random().toString(36).slice(2));
  const serverSessionRef = useRef<{ sessionId: string; version: number } | null>(null);

  useEffect(() => {
    let ignore = false;
    void initServerSession(setId, "match").then((sess) => {
      if (sess && !ignore) {
        serverSessionRef.current = sess;
      }
    });
    return () => {
      ignore = true;
    };
  }, [setId]);

  const currentStage: MatchStage | undefined = plan.stages[currentStageIdx];

  // Active gameplay timer interval
  useEffect(() => {
    if (isPaused || isStageCleared || isGameFinished || !currentStage) {
      return;
    }

    const interval = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isStageCleared, isGameFinished, currentStage]);

  // Restart match game with a fresh shuffle
  const handleRestart = useCallback(() => {
    const newPlan = createMatchPlan(cards);
    setPlan(newPlan);
    setCurrentStageIdx(0);
    setActiveSeconds(0);
    setMismatchCount(0);
    setIsPaused(false);
    setIsStageCleared(false);
    setIsGameFinished(false);
  }, [cards]);

  const handleStageClear = () => {
    if (currentStageIdx < plan.stages.length - 1) {
      setIsStageCleared(true);
    } else {
      setIsGameFinished(true);
    }
  };

  const handleNextStage = () => {
    if (currentStageIdx < plan.stages.length - 1) {
      setIsStageCleared(false);
      setCurrentStageIdx((prev) => prev + 1);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (plan.stages.length === 0) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto space-y-4">
        <p className="text-sm text-zinc-500">Học phần này chưa có thẻ từ vựng để chơi ghép thẻ.</p>
        <Link href={`/sets/${setId}`}>
          <Button variant="outline" size="sm">
            Quay lại học phần
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại học phần</span>
        </Link>

        <div className="flex items-center gap-3">
          <Badge variant="teal" size="sm">
            Ghép thẻ: {setTitle}
          </Badge>
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
            title={isPaused ? "Tiếp tục" : "Tạm dừng"}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Game HUD Bar */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>
            Thời gian: <strong className="font-mono text-sm text-zinc-950 dark:text-zinc-50">{formatTimer(activeSeconds)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Chặng: <strong className="text-teal-600 dark:text-teal-400">{currentStageIdx + 1}</strong> / {plan.stages.length}
          </span>
          <span className="text-zinc-400">•</span>
          <span>
            Cặp chặng này: <strong className="text-zinc-950 dark:text-zinc-50">{currentStage?.cards.length}</strong>
          </span>
        </div>
      </div>

      {/* PAUSED OVERLAY */}
      {isPaused && (
        <Card className="p-8 text-center max-w-sm mx-auto space-y-4 shadow-xl border-2 border-teal-500/40 animate-in fade-in duration-200">
          <Pause className="w-10 h-10 mx-auto text-teal-600" />
          <h3 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Đang tạm dừng</h3>
          <p className="text-xs text-zinc-500">Đồng hồ đếm giờ đã được ngưng lại.</p>
          <Button variant="primary" size="md" className="w-full" onClick={() => setIsPaused(false)}>
            <Play className="w-4 h-4 mr-1.5" />
            Tiếp tục chơi
          </Button>
        </Card>
      )}

      {/* STAGE CLEARED MODAL / BANNER */}
      {!isPaused && isStageCleared && (
        <Card className="p-8 text-center max-w-md mx-auto space-y-5 shadow-2xl border-2 border-teal-500/60 bg-gradient-to-b from-teal-50/40 via-white to-zinc-50 dark:from-teal-950/30 dark:via-zinc-900 dark:to-zinc-900 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">
              Hoàn thành chặng {currentStageIdx + 1}!
            </h3>
            <p className="text-xs text-zinc-500">
              Đã ghép đúng toàn bộ {currentStage?.cards.length} cặp thẻ. Thời gian nghỉ giữa chặng không cộng dồn.
            </p>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={handleNextStage}>
            <span>Chuyển sang chặng {currentStageIdx + 2}</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Card>
      )}

      {/* FINAL FINISHED VIEW */}
      {!isPaused && isGameFinished && (
        <Card className="p-8 text-center max-w-lg mx-auto space-y-6 shadow-2xl border-2 border-teal-500/40 bg-gradient-to-b from-teal-50/20 via-white to-zinc-50 dark:from-teal-950/20 dark:via-zinc-900 dark:to-zinc-900 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-3xl font-black text-zinc-950 dark:text-zinc-50">
              Chiến thắng Ghép thẻ!
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500">
              Bạn đã hoàn thành toàn bộ {plan.totalPairs} cặp từ vựng trong {plan.stages.length} chặng.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60">
              <p className="text-xs text-zinc-500">Thời gian hoàn thành</p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
                {formatTimer(activeSeconds)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/60">
              <p className="text-xs text-zinc-500">Số lần ghép lệch</p>
              <p className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-zinc-50 mt-1">
                {mismatchCount}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <Info className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
            <span>Tiến độ ghép thẻ đã được lưu cục bộ (localStorage). Đồng bộ máy chủ sẽ khả dụng khi kết nối T12.</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {/* Replay button - strictly only unlocked upon finishing full set */}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleRestart}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Chơi lại từ đầu
            </Button>

            <Link href={`/sets/${setId}`} className="w-full">
              <Button variant="primary" size="md" className="w-full">
                <BookOpen className="w-4 h-4 mr-1.5" />
                Về học phần
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ACTIVE TILES GRID */}
      {!isPaused && !isStageCleared && !isGameFinished && currentStage && (
        <MatchBoard
          key={currentStageIdx}
          stage={currentStage}
          setId={setId}
          sessionId={sessionId}
          serverSessionRef={serverSessionRef}
          onMismatch={() => setMismatchCount((prev) => prev + 1)}
          onStageClear={handleStageClear}
          isPaused={isPaused}
        />
      )}
    </div>
  );
}
