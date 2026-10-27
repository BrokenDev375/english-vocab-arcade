import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const fallbackRedirect = type === "recovery" ? "/reset-password" : "/dashboard";
  const safeTarget = getSafeRedirectUrl(next, fallbackRedirect);

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${safeTarget}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
