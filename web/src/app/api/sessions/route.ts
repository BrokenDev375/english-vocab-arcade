import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { createOrResumeSession, type SessionMode } from "@/features/study/sessions.repository";

const CreateSessionSchema = z.object({
  setId: z.string().uuid(),
  mode: z.enum([
    "flashcard",
    "learn",
    "test",
    "match",
    "arcade_typing",
    "arcade_recall",
    "dictation",
    "speak",
    "grammar",
    "reading",
    "translate",
  ]),
  action: z.enum(["resume_or_create", "restart"]).default("resume_or_create"),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập để tạo phiên học" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Dữ liệu tạo phiên không hợp lệ",
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { setId, mode, action, settings } = parsed.data;

    const result = await createOrResumeSession({
      userId: user.id,
      setId,
      mode: mode as SessionMode,
      action,
      settings,
    });

    return NextResponse.json(
      {
        data: result.session,
        meta: {
          isNew: result.isNew,
          version: result.session.state_version,
        },
      },
      { status: result.isNew ? 201 : 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý phiên học";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
