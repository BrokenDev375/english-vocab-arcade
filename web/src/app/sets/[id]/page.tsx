import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  Gamepad2,
  Layers,
  GraduationCap,
  ArrowLeft,
  Puzzle,
  Award,
  Edit3,
  Sparkles,
  BookOpen,
  Languages,
  Headphones,
  Mic,
} from "lucide-react";

export function generateStaticParams() {
  return DEMO_SETS.map((set) => ({ id: set.id }));
}

interface SetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { id } = await params;

  let currentSet: {
    id: string;
    title: string;
    description: string;
    cefrLevel: string;
    topic: string;
  };
  let cards: Array<{
    id: string;
    term: string;
    meaningVi: string;
    partOfSpeech: string;
    ipa?: string | null;
    cefrLevel?: string | null;
    exampleEn?: string | null;
    exampleVi?: string | null;
    position: number;
  }>;

  if (id.startsWith("d000")) {
    const demo = DEMO_SETS.find((s) => s.id === id);
    if (!demo) {
      notFound();
    }
    currentSet = {
      id: demo.id,
      title: demo.title,
      description: demo.description || "",
      cefrLevel: demo.cefrLevel,
      topic: demo.topic,
    };
    const rawCards = demo.cards || DEMO_CARDS;
    cards = rawCards.map((c) => ({
      id: c.id,
      term: c.term,
      meaningVi: c.meaningVi,
      partOfSpeech: c.partOfSpeech,
      ipa: c.ipa || null,
      cefrLevel: c.cefrLevel || null,
      exampleEn: c.exampleEn || null,
      exampleVi: c.exampleVi || null,
      position: c.position,
    }));
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: setRow } = await supabase
      .from("learning_sets")
      .select("id, title, description, cefr_level, topic, is_public")
      .eq("id", id)
      .maybeSingle();

    if (!setRow) {
      notFound();
    }

    currentSet = {
      id: setRow.id,
      title: setRow.title,
      description: setRow.description || "",
      cefrLevel: setRow.cefr_level || "A1",
      topic: setRow.topic || "general",
    };

    const { data: cardsRows } = await supabase
      .from("vocabulary_cards")
      .select("id, term, meaning_vi, part_of_speech, cefr_level, ipa, example_en, example_vi, position")
      .eq("set_id", id)
      .order("position", { ascending: true });

    cards = (cardsRows || []).map((c) => ({
      id: c.id,
      term: c.term,
      meaningVi: c.meaning_vi,
      partOfSpeech: c.part_of_speech,
      cefrLevel: c.cefr_level || null,
      ipa: c.ipa || null,
      exampleEn: c.example_en || null,
      exampleVi: c.example_vi || null,
      position: c.position,
    }));
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Navigation back */}
        <div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Khám phá</span>
          </Link>
        </div>

        {/* Set Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/20">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="teal" size="md">
                CEFR {currentSet.cefrLevel.toUpperCase()}
              </Badge>
              <Badge variant="zinc" size="md">
                {cards.length} thẻ từ
              </Badge>
              <span className="text-xs text-zinc-500 font-medium">
                Chủ đề: {currentSet.topic}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
              {currentSet.title}
            </h1>

            {currentSet.description && (
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {currentSet.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            <Link href={`/sets/${currentSet.id}/edit`} className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Edit3 className="w-4 h-4 mr-2 text-zinc-500" />
                Chỉnh sửa
              </Button>
            </Link>
            <Link href={`/sets/${currentSet.id}/arcade`} className="w-full sm:w-auto">
              <Button variant="amber" size="lg" className="w-full sm:w-auto shadow-md shadow-amber-500/20">
                <Gamepad2 className="w-5 h-5 mr-2" />
                Word Blaster
              </Button>
            </Link>
            <Link href={`/sets/${currentSet.id}/flashcards`} className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                <Layers className="w-5 h-5 mr-2" />
                Lật Flashcard
              </Button>
            </Link>
          </div>
        </div>

        {/* Study Modes Hub */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Các chế độ học tập với bộ thẻ này
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Link href={`/sets/${currentSet.id}/flashcards`}>
              <Card hoverable className="p-4 text-center space-y-2">
                <Layers className="w-6 h-6 mx-auto text-teal-600 dark:text-teal-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Flashcard</h4>
                <p className="text-xs text-zinc-500">Lật thẻ & phát âm</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/learn`}>
              <Card hoverable className="p-4 text-center space-y-2">
                <GraduationCap className="w-6 h-6 mx-auto text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Học thích ứng</h4>
                <p className="text-xs text-zinc-500">Luyện câu & ôn lỗi</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/test`}>
              <Card hoverable className="p-4 text-center space-y-2">
                <Award className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Kiểm tra</h4>
                <p className="text-xs text-zinc-500">Thi & tính điểm</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/match`}>
              <Card hoverable className="p-4 text-center space-y-2">
                <Puzzle className="w-6 h-6 mx-auto text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Ghép thẻ</h4>
                <p className="text-xs text-zinc-500">6 cặp mỗi chặng</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/grammar`}>
              <Card hoverable className="p-4 text-center space-y-2 border-purple-500/30 bg-purple-500/5">
                <Sparkles className="w-6 h-6 mx-auto text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Ngữ pháp</h4>
                <p className="text-xs text-zinc-500">Sắp xếp câu</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/reading`}>
              <Card hoverable className="p-4 text-center space-y-2 border-teal-500/30 bg-teal-500/5">
                <BookOpen className="w-6 h-6 mx-auto text-teal-600 dark:text-teal-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Đọc hiểu</h4>
                <p className="text-xs text-zinc-500">Đoạn văn & câu hỏi</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/translate`}>
              <Card hoverable className="p-4 text-center space-y-2 border-indigo-500/30 bg-indigo-500/5">
                <Languages className="w-6 h-6 mx-auto text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Luyện dịch</h4>
                <p className="text-xs text-zinc-500">Việt → Anh</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/dictation`}>
              <Card hoverable className="p-4 text-center space-y-2 border-blue-500/30 bg-blue-500/5">
                <Headphones className="w-6 h-6 mx-auto text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Chính tả</h4>
                <p className="text-xs text-zinc-500">Nghe & viết</p>
              </Card>
            </Link>

            <Link href={`/sets/${currentSet.id}/speak`}>
              <Card hoverable className="p-4 text-center space-y-2 border-emerald-500/30 bg-emerald-500/5">
                <Mic className="w-6 h-6 mx-auto text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Luyện nói</h4>
                <p className="text-xs text-zinc-500">Thu âm phát âm</p>
              </Card>
            </Link>
          </div>
        </div>

        {/* Card List */}
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Danh sách từ vựng ({cards.length} thẻ)
            </h2>
          </div>

          <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            {cards.map((card) => (
              <div
                key={card.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                {/* Term & Pronunciation */}
                <div className="md:w-1/3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
                      {card.term}
                    </span>
                    <Badge variant="zinc" size="sm">
                      {card.partOfSpeech}
                    </Badge>
                    {card.cefrLevel && (
                      <Badge variant="teal" size="sm">
                        {card.cefrLevel}
                      </Badge>
                    )}
                  </div>
                  {card.ipa && (
                    <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                      {card.ipa}
                    </p>
                  )}
                </div>

                {/* Meaning */}
                <div className="md:w-1/3">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {card.meaningVi}
                  </p>
                </div>

                {/* Context Example */}
                <div className="md:w-1/3 text-xs text-zinc-500 dark:text-zinc-400">
                  {card.exampleEn && (
                    <p className="font-serif italic text-zinc-700 dark:text-zinc-300">
                      &quot;{card.exampleEn}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
