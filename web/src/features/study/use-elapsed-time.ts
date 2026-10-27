"use client";
import { useCallback, useEffect, useRef } from "react";

/** Active time for one question; hidden tabs and an explicit pause do not count. */
export function useElapsedTime(questionKey: string | number, enabled: boolean) {
  const clock = useRef({ elapsedMs: 0, startedAt: 0, running: false });
  useEffect(() => {
    clock.current.elapsedMs = 0;
    clock.current.startedAt = performance.now();
  }, [questionKey]);
  useEffect(() => {
    const stop = () => {
      if (clock.current.running) clock.current.elapsedMs += performance.now() - clock.current.startedAt;
      clock.current.running = false;
    };
    const update = () => {
      stop();
      if (enabled && !document.hidden) { clock.current.startedAt = performance.now(); clock.current.running = true; }
    };
    update(); document.addEventListener("visibilitychange", update);
    return () => { stop(); document.removeEventListener("visibilitychange", update); };
  }, [enabled]);
  return useCallback(() => Math.min(600000, Math.max(0, Math.round(clock.current.elapsedMs + (clock.current.running ? performance.now() - clock.current.startedAt : 0)))), []);
}
