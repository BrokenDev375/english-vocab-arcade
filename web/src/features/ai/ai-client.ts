import type { AiMode } from "./schemas";

export async function requestAiBatch<T>(setId: string, mode: AiMode, cardIds: string[], signal?: AbortSignal): Promise<{ batchId: string; output: T }> {
  const deadline = Date.now() + 60000;
  let batchId: string | undefined;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    const response = await fetch(batchId ? `/api/ai/batches/${batchId}` : "/api/ai/batches", {
      method: batchId ? "GET" : "POST", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(22000)]) : AbortSignal.timeout(22000),
      ...(batchId ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setId, mode, cardIds }) }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error?.message || "Chưa tạo được bài tập. Vui lòng thử lại sau.");
    if (json.data?.status === "ready" && json.data.output) return { batchId: json.data.batchId || json.data.id, output: json.data.output as T };
    if (json.data?.status === "failed") throw new Error("Tạo bài tập thất bại. Vui lòng thử lại sau.");
    batchId = json.data?.batchId || json.data?.id || batchId;
    if (!batchId) throw new Error("Phản hồi AI không hợp lệ.");
    await new Promise<void>((resolve,reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, 1500);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  throw new Error("Tạo bài tập đang mất nhiều thời gian. Vui lòng thử lại.");
}
