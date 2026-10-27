import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { recordServerAttempt } from "@/features/study/sessions.repository";

const CreateAttemptSchema = z.object({
  sessionId: z.string().uuid(),
  cardId: z.string().uuid(),
  clientEventId: z.string().uuid(),
  questionKey: z.string().min(1).max(160),
  attemptKind: z.enum(["answer", "self_rating", "game_hit", "game_miss"]).default("answer"),
  answerText: z.string().max(2000).default(""),
  activeElapsedMs: z.number().int().nonnegative().default(0),
  expectedVersion: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập để ghi nhận tiến độ" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Dữ liệu trả lời không hợp lệ",
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const {
      sessionId,
      cardId,
      clientEventId,
      questionKey,
      attemptKind,
      answerText,
      activeElapsedMs,
      expectedVersion,
    } = parsed.data;

    const result = await recordServerAttempt({
      userId: user.id,
      sessionId,
      cardId,
      clientEventId,
      questionKey,
      attemptKind,
      userAnswer: answerText,
      activeElapsedMs,
      expectedVersion,
    });

    if (!result.success) {
      if (result.code === "VERSION_CONFLICT") {
        return NextResponse.json(
          {
            error: {
              code: "VERSION_CONFLICT",
              message: "Tiến độ phiên học đã thay đổi.",
              details: { latestVersion: result.version },
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: { code: result.code || "ATTEMPT_FAILED", message: result.error } },
        { status: result.code === "NOT_FOUND" ? 404 : 403 }
      );
    }

    return NextResponse.json(
      {
        data: {
          sessionId,
          cardId,
          isCorrect: result.is_correct,
          isDuplicate: result.is_duplicate || false,
          version: result.version,
        },
        meta: {
          clientEventId,
          version: result.version,
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi ghi nhận kết quả bài học";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
