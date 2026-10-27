import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth.server";
import {
  getLearningSetById,
  updateLearningSet,
  deleteLearningSet,
} from "@/features/sets/sets.repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UpdateSetSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional(),
  cefrLevel: z.enum(["A1", "A2", "B1", "mixed"]).optional(),
  topic: z.string().min(1).max(80).optional(),
  isPublic: z.boolean().optional(),
  expectedRevision: z.number().int().positive().optional(),
});

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const set = await getLearningSetById(supabase, id);
    if (!set) {
      return NextResponse.json(
        { error: "Không tìm thấy học phần hoặc học phần đang ở chế độ riêng tư" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: set });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi máy chủ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Yêu cầu đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu cập nhật không hợp lệ", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const updated = await updateLearningSet(supabase, id, {
      title: parsed.data.title,
      description: parsed.data.description,
      cefrLevel: parsed.data.cefrLevel,
      topic: parsed.data.topic,
      isPublic: parsed.data.isPublic,
      expectedRevision: parsed.data.expectedRevision,
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi cập nhật học phần";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Yêu cầu đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    await deleteLearningSet(supabase, id);

    return NextResponse.json({ success: true, message: "Đã xóa học phần thành công" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi xóa học phần";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
