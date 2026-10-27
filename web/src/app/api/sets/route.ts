import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth.server";
import { listLearningSets, createLearningSet } from "@/features/sets/sets.repository";

const CreateSetSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  cefrLevel: z.enum(["A1", "A2", "B1", "mixed"]).default("A1"),
  topic: z.string().min(1).max(80),
  isPublic: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") === "user" ? "user" : "explore") as "user" | "explore";
    const search = searchParams.get("search") || "";
    const level = searchParams.get("level") || "ALL";
    const topic = searchParams.get("topic") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

    const supabase = await createSupabaseServerClient();

    const { sets, total } = await listLearningSets(supabase, {
      scope,
      search,
      level,
      topic,
      page,
      pageSize,
    });

    return NextResponse.json({
      data: sets,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi truy vấn danh sách học phần";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để tạo học phần mới" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreateSetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu học phần không hợp lệ", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const createdSet = await createLearningSet(supabase, {
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      cefrLevel: parsed.data.cefrLevel,
      topic: parsed.data.topic,
      isPublic: parsed.data.isPublic,
    });

    return NextResponse.json({ data: createdSet }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Lỗi máy chủ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
