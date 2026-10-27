import { getRequestOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  const safeTarget = getSafeRedirectUrl(next, "/dashboard");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeTarget}`);
    }
  }

  // Return to login with error if exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
