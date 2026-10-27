import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth.server";
import {
  getSessionById,
  updateSessionState,
  type SessionStatus,
} from "@/features/study/sessions.repository";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const session = await getSessionById(user.id, id);

    if (!session) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Không tìm thấy phiên học" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: session,
      meta: { version: session.state_version },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi truy vấn phiên học";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

const UpdateSessionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  activeElapsedMs: z.number().int().nonnegative().default(0),
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Dữ liệu cập nhật phiên không hợp lệ",
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { expectedVersion, state, activeElapsedMs, status } = parsed.data;

    const result = await updateSessionState(
      user.id,
      id,
      expectedVersion,
      state,
      activeElapsedMs,
      status as SessionStatus | undefined
    );

    if (!result.success) {
      if (result.code === "VERSION_CONFLICT") {
        return NextResponse.json(
          {
            error: {
              code: "VERSION_CONFLICT",
              message: "Tiến độ đã được cập nhật ở nơi khác.",
              retryable: false,
              details: {
                latestVersion: result.latest_version,
                currentState: result.current_state,
              },
            },
          },
          { status: 409 }
        );
      }

      if (result.code === "TERMINAL_SESSION") {
        return NextResponse.json(
          {
            error: {
              code: "TERMINAL_SESSION",
              message: "Không thể cập nhật phiên học đã kết thúc.",
            },
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: { code: result.code || "UPDATE_FAILED", message: result.error } },
        { status: result.code === "NOT_FOUND" ? 404 : 403 }
      );
    }

    return NextResponse.json({
      data: {
        sessionId: id,
        version: result.new_version,
        status: status || "active",
      },
      meta: { version: result.new_version },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi lưu tiến độ";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
