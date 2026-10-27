import { generateClientEventId, recordLocalAttempt, getLocalSessionAttempts, type StudyAttemptRecord } from "./study-client-adapter";

export interface ServerStudySession {
  id: string;
  state_version: number;
  active_elapsed_ms: number;
  state: { clientState?: Record<string, unknown>; clientMutationId?: string };
  seed: string;
  content_snapshot: Array<{ id: string; term: string; meaning_vi: string; accepted_answers?: string[] }>;
}
type Operation = { id: string; kind: "attempt" | "state"; body: Record<string, unknown> };
interface Backup {
  sessionId: string;
  version: number;
  elapsedMs: number;
  snapshot: Record<string, unknown>;
  pending: Operation[];
}
export const sessionBackupKey = (userId: string, setId: string, mode: string) => `eva:v1:${userId}:${setId}:${mode}:sync-v2`;
export function readSessionBackup(key: string): Backup | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (!value || typeof value.sessionId !== "string" || !Number.isInteger(value.version) || value.version < 1 || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0 || !value.snapshot || typeof value.snapshot !== "object" || !Array.isArray(value.pending)) return null;
    if (!value.pending.every((op: Operation) => op && typeof op.id === "string" && ["attempt", "state"].includes(op.kind) && op.body && typeof op.body === "object")) return null;
    return value as Backup;
  } catch { return null; }
}

const activeSessions = new Set<SessionSync>();
export async function flushStudySessions() {
  await Promise.all([...activeSessions].map(session => session.flush()));
  return [...activeSessions].every(session => !session.hasPending());
}
/** One ordered, durable queue per mounted study session. A retry keeps its original event ID. */
export class SessionSync {
  private pending: Operation[] = [];
  private pumping = false;
  private waiters: Array<() => void> = [];
  private stopped = false;
  private conflicted = false;
  private lastSavedSignature = "";
  private inFlight: string | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private version: number;
  private elapsedMs: number;
  private snapshot: Record<string, unknown> = {};
  readonly sessionId: string;
  readonly key: string;

  constructor(readonly userId: string, setId: string, readonly mode: string, readonly server: ServerStudySession | null, private notify: (message: string | null) => void) {
    activeSessions.add(this);
    this.key = sessionBackupKey(userId, setId, mode);
    const backup = readSessionBackup(this.key);
    this.sessionId = server?.id || backup?.sessionId || generateClientEventId();
    const matching = backup?.sessionId === this.sessionId ? backup : null;
    // Keep the last acknowledged version if a response was lost: GET can reconcile our mutation ID.
    const localAhead = matching && (!server || matching.pending.length > 0);
    this.version = localAhead ? matching.version : server?.state_version || matching?.version || 1;
    this.elapsedMs = localAhead ? matching.elapsedMs : server?.active_elapsed_ms || matching?.elapsedMs || 0;
    this.snapshot = localAhead ? matching.snapshot : server?.state?.clientState || matching?.snapshot || {};
    this.pending = matching?.pending || [];
  }

  restoredState() { return this.snapshot; }
  private persist() {
    try {
      localStorage.setItem(this.key, JSON.stringify({ sessionId: this.sessionId, version: this.version, elapsedMs: this.elapsedMs, snapshot: this.snapshot, pending: this.pending } satisfies Backup));
    } catch { this.notify("Bộ nhớ trình duyệt đầy; hãy giữ trang mở để đồng bộ tiến độ."); }
  }

  record(attempt: StudyAttemptRecord, questionKey?: string) {
    if (this.stopped || this.conflicted) return;
    if (this.pending.some(op => op.id === attempt.clientEventId) || getLocalSessionAttempts(this.sessionId, this.userId).some(op => op.clientEventId === attempt.clientEventId)) return;
    const durationMs = Number.isFinite(attempt.durationMs) ? Math.round(Math.max(0, Math.min(600000, attempt.durationMs))) : 0;
    const local = { ...attempt, durationMs, sessionId: this.sessionId, userId: this.userId };
    recordLocalAttempt(local, this.userId);
    this.elapsedMs += durationMs;
    if (this.server) {
      this.pending.push({ id: attempt.clientEventId, kind: "attempt", body: {
        sessionId: this.sessionId, cardId: attempt.cardId, clientEventId: attempt.clientEventId,
        questionKey: questionKey || `${attempt.questionType}:${attempt.cardId}`,
        attemptKind: attempt.questionType === "flashcard_self_rate" ? "self_rating" : attempt.questionType.startsWith("arcade_") ? (attempt.isCorrect ? "game_hit" : "game_miss") : "answer",
        answerText: attempt.userAnswer, activeElapsedMs: durationMs,
      } });
    }
    this.persist();
    void this.flush();
  }

  save(snapshot: Record<string, unknown>, status: "active" | "paused" | "completed" = "active") {
    if (this.stopped || this.conflicted) return;
    const signature = JSON.stringify({ snapshot, status, elapsedMs: this.elapsedMs });
    if (signature === this.lastSavedSignature) return;
    this.lastSavedSignature = signature;
    this.snapshot = snapshot;
    if (this.server) {
      const id = generateClientEventId();
      const next: Operation = { id, kind: "state", body: { state: { clientState: snapshot, clientMutationId: id }, status, activeElapsedMs: this.elapsedMs } };
      const last = this.pending.at(-1);
      if (last?.kind === "state" && last.id !== this.inFlight) this.pending[this.pending.length - 1] = next;
      else this.pending.push(next);
    }
    this.persist();
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 300);
  }

  async flush(): Promise<void> {
    if (this.pumping) { await new Promise<void>(resolve => this.waiters.push(resolve)); return; }
    if (this.stopped || this.conflicted || !this.server) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    this.pumping = true;
    try {
      while (this.pending.length && !this.stopped) {
        const op = this.pending[0];
        this.inFlight = op.id;
        const body = JSON.stringify({ ...op.body, expectedVersion: this.version });
        const response = await fetch(op.kind === "attempt" ? "/api/attempts" : `/api/sessions/${this.sessionId}`, {
          method: op.kind === "attempt" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" },
          body, signal: AbortSignal.timeout(12000), keepalive: new TextEncoder().encode(body).byteLength < 60000,
        });
        if (this.stopped) break;
        const json = await response.json();
        if (response.status === 409 || (op.kind === "state" && response.status === 400 && json.error?.code === "TERMINAL_SESSION")) {
          const latest = await fetch(`/api/sessions/${this.sessionId}`, { signal: AbortSignal.timeout(10000) });
          if (!latest.ok) throw new Error("Không đọc được phiên học mới nhất.");
          const { data } = await latest.json();
          if (op.kind === "state" && data.state?.clientMutationId === op.id) {
            this.version = data.state_version;
          } else {
            this.conflicted = true;
            this.notify("Phiên học đã thay đổi ở tab khác. Hãy tải lại trang để tiếp tục; bản lưu trên máy vẫn được giữ.");
            break;
          }
        } else if (!response.ok) {
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            this.conflicted = true;
            this.notify(json.error?.message || "Chưa thể đồng bộ phiên học. Hãy đăng nhập lại hoặc tải lại trang.");
            break;
          }
          throw new Error("Tạm mất kết nối. Tiến độ đã lưu trên máy và sẽ được gửi lại.");
        } else this.version = json.meta?.version || json.data?.version || this.version;
        this.pending.shift();
        this.persist();
      }
      if (!this.pending.length) this.notify(null);
    } catch {
      if (!this.stopped) {
        this.notify("Chưa đồng bộ được. Tiến độ đã lưu trên máy; đang thử kết nối lại.");
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 3000);
      }
    } finally { this.inFlight = null; this.pumping = false; this.waiters.splice(0).forEach(resolve => resolve()); }
  }
  isConflicted() { return this.conflicted; }
  preserveConflict() {
    const backup = localStorage.getItem(this.key);
    if (backup) localStorage.setItem(this.key + ":conflict:" + Date.now(), backup);
    localStorage.removeItem(this.key);
    this.dispose();
  }
  hasPending() { return this.pending.length > 0; }
  dispose() { activeSessions.delete(this); this.stopped = true; if (this.timer) clearTimeout(this.timer); }
}
