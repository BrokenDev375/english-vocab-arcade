import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ResetPasswordSchema = z.object({
  password: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ResetPasswordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Mật khẩu không hợp lệ" },
        { status: 400 }
      );
    }

    const { password } = parsed.data;
    const supabase = await createSupabaseServerClient();

    // Verify authenticated user from recovery session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Phiên làm việc đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại liên kết đổi mật khẩu." },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Không thể cập nhật mật khẩu" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đặt lại mật khẩu thành công.",
        redirectTo: "/dashboard",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
