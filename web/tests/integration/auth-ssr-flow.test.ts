import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe("T04 - Auth SSR Integration Flow (E01)", () => {
  it("executes signup, login, getUser server verification, and logout cleanly", async () => {
    const client = createClient<Database>(SUPABASE_URL, ANON_KEY);

    const testEmail = `auth_ssr_${Date.now()}@example.com`;
    const testPassword = "Password123!Secure";

    // 1. SignUp
    const { data: signUpData, error: signUpErr } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: { display_name: "Auth Tester" },
      },
    });

    expect(signUpErr).toBeNull();
    expect(signUpData.user).not.toBeNull();
    expect(signUpData.user?.email).toBe(testEmail);

    // 2. Login
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    expect(signInErr).toBeNull();
    expect(signInData.session).not.toBeNull();
    const token = signInData.session!.access_token;

    // 3. Server Verification via getUser() with verified session token
    const serverVerifiedClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: verifiedUser, error: verifyErr } = await serverVerifiedClient.auth.getUser();
    expect(verifyErr).toBeNull();
    expect(verifiedUser.user?.id).toBe(signUpData.user!.id);

    // 4. Verify Profile was auto-created by database trigger
    const { data: profile } = await serverVerifiedClient
      .from("profiles")
      .select("display_name, timezone")
      .eq("id", verifiedUser.user!.id)
      .single();

    expect(profile).not.toBeNull();
    expect(profile?.display_name).toBe("Auth Tester");
    expect(profile?.timezone).toBe("Asia/Ho_Chi_Minh");

    // 5. SignOut
    const { error: signOutErr } = await serverVerifiedClient.auth.signOut();
    expect(signOutErr).toBeNull();
  });

  it("rejects unauthorized access when session token is fake or expired", async () => {
    const fakeClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: "Bearer fake-token-12345" } },
    });

    const { data: fakeUser, error } = await fakeClient.auth.getUser();
    expect(fakeUser.user).toBeNull();
    expect(error).not.toBeNull();
  });
});
