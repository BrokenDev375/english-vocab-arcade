import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SessionSync, sessionBackupKey, type ServerStudySession } from "@/features/study/session-sync";
import { clearUserLocalData } from "@/features/study/study-client-adapter";
import { fetchAllSetCards } from "@/features/sets/sets-client";
const instances: SessionSync[] = [];
const server: ServerStudySession = { id: "s1", state_version: 1, active_elapsed_ms: 0, state: {}, seed: "seed", content_snapshot: [] };
const event = { clientEventId: "e1", sessionId: "s1", setId: "set1", cardId: "c1", mode: "learn" as const, questionType: "type_in" as const, userAnswer: "apple", isCorrect: true, durationMs: 1000, answeredAt: new Date().toISOString() };
function create(user = "A", session: ServerStudySession | null = server) { const notify = vi.fn(); const sync = new SessionSync(user, "set1", "learn", session, notify); instances.push(sync); return { sync, notify }; }
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { get length() { return values.size; }, key: (i: number) => [...values.keys()][i] || null, getItem: (k: string) => values.get(k) || null, setItem: (k: string,v: string) => values.set(k,v), removeItem: (k: string) => values.delete(k) });
});
afterEach(() => { instances.splice(0).forEach(s => s.dispose()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("durable study queue", () => {
  it("continues syncing new state after an earlier failed request is recovered", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockImplementation(async () => Response.json({ data: { version: 2 } }));
    vi.stubGlobal("fetch", fetcher);
    const { sync, notify } = create(); sync.record(event);
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());
    await sync.flush();
    sync.save({ currentIndex: 8 });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    expect(JSON.parse(fetcher.mock.calls[2][1].body).state.clientState.currentIndex).toBe(8);
  });
  it("rounds frame time to integer milliseconds and does not count a replay twice", async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { requests.push({ url, body: JSON.parse(init.body as string) }); return Response.json({ data: { version: 1 } }); }));
    const { sync } = create();
    const frameEvent = { ...event, durationMs: 16.6666666667 };
    sync.record(frameEvent); sync.record(frameEvent); sync.save({ currentIndex: 1 });
    await sync.flush();
    expect(requests.filter(request => request.url === "/api/attempts")).toHaveLength(1);
    expect(requests[0].body.activeElapsedMs).toBe(17);
    expect(JSON.parse(localStorage.getItem(sync.key)!).elapsedMs).toBe(17);
  });
  it("stores the original event across a network failure and replays it once after reload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const { sync, notify } = create(); sync.record(event);
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());
    const saved = JSON.parse(localStorage.getItem(sync.key)!);
    expect(saved.pending[0].body.clientEventId).toBe("e1");
    sync.dispose();
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { version: 1 } })); vi.stubGlobal("fetch", fetcher);
    const resumed = create().sync; await resumed.flush();
    expect(JSON.parse(fetcher.mock.calls[0][1].body).clientEventId).toBe("e1");
    expect(resumed.hasPending()).toBe(false);
    expect(JSON.parse(localStorage.getItem("eva:v1:A:attempts:s1")!)).toHaveLength(1);
  });
  it("sends answers before completion and uses the acknowledged version", async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(init.body as string) });
      return Response.json({ meta: { version: url === "/api/attempts" ? 1 : 2 } });
    }));
    const { sync } = create(); sync.record(event); sync.save({ currentIndex: 1 }, "completed");
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests.map(r => r.url)).toEqual(["/api/attempts", "/api/sessions/s1"]);
    expect(requests[1].body).toMatchObject({ status: "completed", expectedVersion: 1, activeElapsedMs: 1000 });
  });
  it("keeps accounts separate and clears only the logged out user's backup", () => {
    const a = create("A", null).sync; a.save({ currentIndex: 8 });
    const b = create("B", null).sync; b.save({ currentIndex: 2 });
    expect(b.restoredState()).toEqual({ currentIndex: 2 });
    expect(create("A", null).sync.restoredState()).toEqual({ currentIndex: 8 });
    clearUserLocalData("A");
    expect(localStorage.getItem(sessionBackupKey("A", "set1", "learn"))).toBeNull();
    expect(localStorage.getItem(b.key)).not.toBeNull();
  });
  it("stops at another tab's version instead of overwriting its state", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({}, { status: 409 })).mockResolvedValueOnce(Response.json({ data: { state_version: 2, state: { clientMutationId: "other-tab" } } }));
    vi.stubGlobal("fetch", fetcher);
    const { sync, notify } = create(); sync.save({ currentIndex: 5 }); await sync.flush();
    expect(fetcher).toHaveBeenCalledTimes(2); expect(sync.hasPending()).toBe(true);
    expect(notify.mock.calls.at(-1)?.[0]).toContain("tab khác");
  });
  it("reconciles a lost PATCH response by its mutation ID", async () => {
    let mutationId = "";
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") { mutationId = JSON.parse(init.body as string).state.clientMutationId; return Response.json({}, { status: 409 }); }
      return Response.json({ data: { state_version: 2, state: { clientMutationId: mutationId } } });
    }));
    const { sync } = create(); sync.save({ currentIndex: 5 }); await sync.flush(); expect(sync.hasPending()).toBe(false);
  });
});
it("rejects a partially loaded vocabulary set when page 2 fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ data: [{ id: "c1", term: "apple", position: 0 }], meta: { nextCursor: { id: "c1", position: 0 } } })).mockResolvedValueOnce(new Response("{}", { status: 500 })));
  await expect(fetchAllSetCards("real-set")).rejects.toThrow("đầy đủ thẻ");
});
