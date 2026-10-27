import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { getOrCreateAiBatch } from "@/features/ai/ai.repository";
import type { TargetCardInfo } from "@/features/ai/service.server";

const CreateAiBatchSchema = z.object({
  setId: z.string().uuid(),
  mode: z.enum(["context", "grammar", "reading", "translation"]),
  cardIds: z.array(z.string().uuid()).min(1).max(10),
  targetLevel: z.enum(["A1", "A2", "B1"]).optional(),
  nonce: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Yêu cầu đăng nhập để tạo bài tập AI" } },
        { status: 401 }
      );
    }

    const json = await request.json();
    const parsed = CreateAiBatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message } },
        { status: 400 }
      );
    }

    const { setId, mode, cardIds, targetLevel, nonce } = parsed.data;
    const adminClient = getSupabaseAdminClient();

    // 1. Fetch set to verify existence & read content_revision
    const { data: setRow, error: setError } = await adminClient
      .from("learning_sets")
      .select("id, content_revision, cefr_level")
      .eq("id", setId)
      .maybeSingle();

    if (setError || !setRow) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Bộ từ vựng không tồn tại" } },
        { status: 404 }
      );
    }

    // 2. Fetch cards data
    const { data: cardRows, error: cardsError } = await adminClient
      .from("vocabulary_cards")
      .select("id, term, meaning_vi, part_of_speech, cefr_level, example_en")
      .eq("set_id", setId)
      .in("id", cardIds);

    if (cardsError || !cardRows || cardRows.length === 0) {
      return NextResponse.json(
        { error: { code: "CARDS_NOT_FOUND", message: "Không tìm thấy thẻ hợp lệ" } },
        { status: 404 }
      );
    }

    const cards: TargetCardInfo[] = cardRows.map((c) => ({
      id: c.id,
      term: c.term,
      meaningVi: c.meaning_vi,
      partOfSpeech: c.part_of_speech,
      cefrLevel: c.cefr_level || undefined,
      exampleEn: c.example_en || undefined,
    }));

    // 3. Coordinate cache & generation
    const result = await getOrCreateAiBatch({
      userId: user.id,
      setId,
      mode,
      cards,
      contentRevision: setRow.content_revision,
      targetLevel: targetLevel || (setRow.cefr_level as "A1" | "A2" | "B1") || "A2",
      nonce,
    });

    if (result.status === "ready") {
      return NextResponse.json(
        {
          data: {
            batchId: result.batchId,
            status: "ready",
            cached: result.cached,
            output: result.output,
          },
        },
        { status: 200 }
      );
    }

    if (result.status === "pending") {
      return NextResponse.json(
        {
          data: {
            batchId: result.batchId,
            status: "pending",
            retryAfter: result.retryAfterSeconds || 2,
          },
        },
        {
          status: 202,
          headers: { "Retry-After": String(result.retryAfterSeconds || 2) },
        }
      );
    }

    if (result.status === "quota_exceeded" || result.status === "rate_limited") {
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: { code: result.code || "GENERATION_FAILED", message: result.error } },
      { status: 502 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống khi tạo bài tập AI";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}
