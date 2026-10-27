import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { getUserStats } from "@/features/stats/stats.repository";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập để xem thống kê" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") || "Asia/Ho_Chi_Minh";

    const stats = await getUserStats(user.id, { timezone });

    return NextResponse.json({
      data: stats,
      meta: {
        userId: user.id,
        timezone,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi truy vấn thống kê";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
