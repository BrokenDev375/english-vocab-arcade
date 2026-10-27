import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && ((error.status || 0) >= 500 || error.name === "AuthRetryableFetchError")) return NextResponse.json({ error: "Chưa xác minh được tài khoản." }, { status: 503 });
  return NextResponse.json({ userId: data.user?.id || null }, { headers: { "Cache-Control": "no-store" } });
}
