import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { updateSetCard, deleteSetCard } from "@/features/sets/sets.repository";

interface RouteParams {
  params: Promise<{ id: string; cardId: string }>;
}

const UpdateCardSchema = z.object({
  term: z.string().min(1).max(80).optional(),
  meaningVi: z.string().min(1).max(300).optional(),
  partOfSpeech: z.enum(["noun", "verb", "adjective", "adverb", "phrase", "other"]).optional(),
  ipa: z.string().max(120).nullable().optional(),
  cefrLevel: z.enum(["A1", "A2", "B1"]).nullable().optional(),
  exampleEn: z.string().max(500).nullable().optional(),
  exampleVi: z.string().max(500).nullable().optional(),
  acceptedAnswers: z.array(z.string().min(1).max(80)).optional(),
  position: z.number().int().nonnegative().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Yêu cầu đăng nhập" }, { status: 401 });
    }

    const { cardId } = await params;
    const body = await request.json();
    const parsed = UpdateCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu sửa thẻ không hợp lệ", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const updated = await updateSetCard(supabase, cardId, parsed.data);

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi sửa thẻ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Yêu cầu đăng nhập" }, { status: 401 });
    }

    const { cardId } = await params;
    const supabase = await createSupabaseServerClient();

    await deleteSetCard(supabase, cardId);

    return NextResponse.json({ success: true, message: "Đã xóa thẻ thành công" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xóa thẻ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
