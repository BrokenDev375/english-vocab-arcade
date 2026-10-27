import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Email không hợp lệ" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const { origin } = new URL(request.url);
    const supabase = await createSupabaseServerClient();

    // Send recovery email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/api/auth/confirm?type=recovery`,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Không thể gửi email đặt lại mật khẩu" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
