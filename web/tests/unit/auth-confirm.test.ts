import { beforeEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
import { GET } from "@/app/api/auth/confirm/route";
beforeEach(() => { vi.clearAllMocks(); auth.exchangeCodeForSession.mockResolvedValue({ error: null }); auth.verifyOtp.mockResolvedValue({ error: null }); });
it("accepts the default PKCE recovery link and preserves the external host", async () => {
  const result = await GET(new Request("http://localhost:3197/auth/confirm?type=recovery&code=test-code", { headers: { host: "127.0.0.1:3197" } }));
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
  expect(result.headers.get("location")).toBe("http://127.0.0.1:3197/reset-password");
});
it("also supports TokenHash templates and blocks an external next URL", async () => {
  const result = await GET(new Request("http://localhost:3197/auth/confirm?type=recovery&token_hash=test-token&next=https://invalid.example", { headers: { host: "127.0.0.1:3197" } }));
  expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "test-token" });
  expect(result.headers.get("location")).toBe("http://127.0.0.1:3197/reset-password");
});
