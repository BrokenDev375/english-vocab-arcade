"use client";
import { isDemoSetId } from "@/features/sets/sets-client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStudyIdentity } from "@/components/auth/AuthProvider";
import { generateClientEventId, type StudyAttemptRecord } from "./study-client-adapter";
import { SessionSync, sessionBackupKey, type ServerStudySession } from "./session-sync";

export function useStudySession(setId: string, mode: string, snapshot: Record<string, unknown>, restore: (value: Record<string, unknown>) => void, enabled = true, status: "active" | "paused" | "completed" = "active") {
  const identity = useStudyIdentity();
  const sync = useRef<SessionSync | null>(null);
  const restoreRef = useRef(restore);
  const snapshotRef = useRef({ snapshot, status });
  useEffect(() => { restoreRef.current = restore; snapshotRef.current = { snapshot, status }; });
  const [generation, setGeneration] = useState(0);
  const tag = `${identity.userId}:${setId}:${mode}:${generation}`;
  const [readyFor, setReadyFor] = useState("");
  const ready = identity.ready && readyFor === tag;
  const [error, setError] = useState<string | null>(null);
  const initialize = useCallback(async (restart = false) => {
    let server: ServerStudySession | null = null;
    if (identity.userId !== "guest" && !isDemoSetId(setId)) {
      const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setId, mode, action: restart ? "restart" : "resume_or_create" }), signal: AbortSignal.timeout(15000) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || "Không mở được phiên học. Hãy thử lại.");
      server = json.data;
    }
    if (restart && !server) localStorage.removeItem(sessionBackupKey(identity.userId, setId, mode));
    return new SessionSync(identity.userId, setId, mode, server, setError);
  }, [identity.userId, setId, mode]);

  useEffect(() => {
    if (!enabled || !identity.ready) return;
    let mounted = true;
    void initialize().then(result => {
      if (!mounted) { result.dispose(); return; }
      sync.current = result;
      const restored = result.restoredState();
      if (Object.keys(restored).length) restoreRef.current(restored);
      setReadyFor(tag);
      void result.flush();
    }).catch(err => { if (mounted) setError(err instanceof Error ? err.message : "Không mở được phiên học."); });
    const stop = () => sync.current?.dispose();
    const flush = () => { void sync.current?.flush(); };
    const leave = () => { const current = sync.current; if (current) { current.save(snapshotRef.current.snapshot, snapshotRef.current.status); void current.flush(); } };
    window.addEventListener("eva-auth-leaving", stop);
    window.addEventListener("online", flush);
    window.addEventListener("pagehide", leave);
    return () => {
      mounted = false;
      window.removeEventListener("eva-auth-leaving", stop);
      window.removeEventListener("online", flush); window.removeEventListener("pagehide", leave);
      const current = sync.current;
      if (current) { current.save(snapshotRef.current.snapshot, snapshotRef.current.status); current.dispose(); }
      sync.current = null;
    };
  }, [enabled, identity.ready, initialize, generation, tag]);

  const serialized = JSON.stringify(snapshot);
  useEffect(() => {
    if (!ready || !sync.current) return;
    // State is stored locally immediately; the queue coalesces remote state writes.
    if (!mode.startsWith("arcade_") || status !== "active") sync.current.save(JSON.parse(serialized), status);
  }, [serialized, status, ready, mode]);
  useEffect(() => {
    if (!ready || !mode.startsWith("arcade_")) return;
    const timer = setInterval(() => sync.current?.save(snapshotRef.current.snapshot, snapshotRef.current.status), 500);
    return () => clearInterval(timer);
  }, [ready, mode]);

  const record = useCallback((attempt: Omit<StudyAttemptRecord, "sessionId" | "setId" | "userId">, questionKey?: string) => {
    if (!sync.current) return;
    sync.current.record({ ...attempt, sessionId: sync.current.sessionId, setId, userId: identity.userId }, questionKey);
  }, [identity.userId, setId]);
  const restart = useCallback(async (reset: () => void) => {
    try {
      const current = sync.current;
      await current?.flush();
      if (current?.hasPending()) { setError("Hãy chờ đồng bộ xong trước khi bắt đầu lượt mới."); return; }
      const next = await initialize(true);
      current?.dispose(); sync.current = next; reset(); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Chưa bắt đầu được lượt mới."); }
  }, [initialize]);
  return { ready: !enabled || ready, error, record, restart, retry: () => { if (sync.current?.isConflicted()) { sync.current.preserveConflict(); window.location.reload(); } else if (ready) { void sync.current?.flush(); } else { setError(null); setGeneration(v => v + 1); } }, newEventId: generateClientEventId };
}
