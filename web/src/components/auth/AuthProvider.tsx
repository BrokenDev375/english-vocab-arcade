"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearUserLocalData } from "@/features/study/study-client-adapter";

const AuthContext = createContext<{ userId: string; ready: boolean }>({ userId: "guest", ready: false });
export const useStudyIdentity = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState({ userId: "guest", ready: false });
  useEffect(() => {
    let mounted = true;
    let previous = "guest";
    let requestVersion = 0;
    const client = getSupabaseBrowserClient();
    const refresh = async () => {
      const version = ++requestVersion;
      const response = await fetch("/api/auth/user", { signal: AbortSignal.timeout(10000) }).catch(() => null);
      if (!response?.ok) { if (mounted) setError("Không xác minh được tài khoản. Hãy kiểm tra mạng rồi tải lại trang."); return; } // Do not turn a network outage into another user's guest session.
      const { userId } = await response.json();
      if (!mounted || version !== requestVersion) return;
      const next = userId || "guest";
      if (previous !== next) { window.dispatchEvent(new Event("eva-auth-leaving")); if (previous !== "guest") clearUserLocalData(previous); }
      setError(null);
      previous = next;
      setIdentity({ userId: next, ready: true });
    };
    void refresh();
    const { data } = client.auth.onAuthStateChange(() => { void refresh(); });
    const changed = () => { setIdentity(v => ({ ...v, ready: false })); void refresh(); };
    window.addEventListener("eva-auth-changed", changed);
    window.addEventListener("online", refresh);
    return () => { mounted = false; data.subscription.unsubscribe(); window.removeEventListener("eva-auth-changed", changed); window.removeEventListener("online", refresh); };
  }, []);
  return <AuthContext.Provider value={identity}>{error && <div role="alert" className="border p-3">{error}<button onClick={() => window.location.reload()}>Tải lại</button></div>}{identity.ready ? <div key={identity.userId} className="contents">{children}</div> : <p role="status" className="p-6">Đang xác minh phiên đăng nhập...</p>}</AuthContext.Provider>;
}
