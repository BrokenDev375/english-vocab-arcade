import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { getAiBatchById } from "@/features/ai/ai.repository";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập" } },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const batch = await getAiBatchById(user.id, id);

    if (!batch) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Không tìm thấy bài tập AI" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: batch.id,
        mode: batch.mode,
        status: batch.status,
        output: batch.output,
        modelId: batch.model_id,
        errorCode: batch.error_code,
        updatedAt: batch.updated_at,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi truy vấn bài tập AI";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
