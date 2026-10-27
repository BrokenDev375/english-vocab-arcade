import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { listSetCards, insertSetCards } from "@/features/sets/sets.repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CardInputSchema = z.object({
  id: z.string().uuid().optional(),
  term: z.string().min(1).max(80),
  meaningVi: z.string().min(1).max(300),
  partOfSpeech: z.enum(["noun", "verb", "adjective", "adverb", "phrase", "other"]),
  ipa: z.string().max(120).nullable().optional(),
  cefrLevel: z.enum(["A1", "A2", "B1"]).nullable().optional(),
  exampleEn: z.string().max(500).nullable().optional(),
  exampleVi: z.string().max(500).nullable().optional(),
  acceptedAnswers: z.array(z.string().min(1).max(80)).optional(),
  position: z.number().int().nonnegative().optional(),
  importKey: z.string().max(100).nullable().optional(),
});

const BatchInsertSchema = z.object({
  cards: z.array(CardInputSchema).min(1).max(100),
});

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const cursorPositionParam = searchParams.get("cursorPosition");
    const cursorId = searchParams.get("cursorId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    const cursorPosition =
      cursorPositionParam !== null ? parseInt(cursorPositionParam, 10) : undefined;

    const supabase = await createSupabaseServerClient();
    const { data: visibleSet, error: setError } = await supabase.from("learning_sets").select("id").eq("id", id).maybeSingle();
    if (setError) throw new Error("Không xác minh được học phần. Hãy thử lại.");
    if (!visibleSet) return NextResponse.json({ error: "Không tìm thấy học phần hoặc bạn không có quyền truy cập." }, { status: 404 });
    const result = await listSetCards(supabase, id, {
      cursorPosition,
      cursorId,
      limit,
    });

    return NextResponse.json({
      data: result.cards,
      meta: {
        count: result.cards.length,
        nextCursor: result.nextCursor,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi tải thẻ từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Yêu cầu đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = BatchInsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu thẻ không hợp lệ", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const insertedCards = await insertSetCards(supabase, id, parsed.data.cards);

    return NextResponse.json({ data: insertedCards }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi thêm thẻ từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
