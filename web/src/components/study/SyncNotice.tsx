"use client";
export function SyncNotice({ message, ready, retry }: { message: string | null; ready: boolean; retry: () => void }) {
  if (!message) return null;
  return <div role="status" className="my-3 rounded-xl border border-amber-400 p-3 text-sm">{message} <button className="ml-2 underline" onClick={retry}>{ready ? "Thử đồng bộ lại" : "Thử lại"}</button></div>;
}
