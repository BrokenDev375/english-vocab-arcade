import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { getUserProgressSummary } from "@/features/study/sessions.repository";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập để xem tiến độ" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const setId = searchParams.get("setId") || undefined;

    const summary = await getUserProgressSummary(user.id, setId);

    return NextResponse.json({
      data: summary,
      meta: {
        userId: user.id,
        setId: setId || null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi truy vấn tiến độ học tập";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
