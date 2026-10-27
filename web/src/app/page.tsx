import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_CARDS, DEMO_SETS } from "@/data/demo/vocabulary.demo";
import {
  Gamepad2,
  Sparkles,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Target,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const sampleSet = DEMO_SETS[0];
  const featuredCards = DEMO_CARDS.slice(0, 6);

  return (
    <AppShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 md:py-16">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <span>Nền tảng học từ vựng tiếng Anh thế hệ mới cho người Việt</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.15]">
            Học từ vựng A1–B1 qua{" "}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
              phản xạ
            </span>{" "}
            và{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              Arcade Minigame
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Ghi nhớ từ vựng tiếng Anh tự nhiên với phương pháp ngắt quãng khoa học, lật thẻ Flashcard, ghép cặp thông minh và game gõ từ bắn mục tiêu <strong>Word Blaster</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href={`/sets/${sampleSet.id}/arcade`} className="w-full sm:w-auto">
              <Button variant="amber" size="lg" className="w-full sm:w-auto shadow-lg shadow-amber-500/20">
                <Gamepad2 className="w-5 h-5 mr-2" />
                Chơi thử Word Blaster
              </Button>
            </Link>
            <Link href="/explore" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <BookOpen className="w-5 h-5 mr-2" />
                Khám phá bộ từ vựng
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-12 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Học tập đa phương thức, nhớ lâu không áp lực
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-2">
            Đầy đủ các công cụ ôn luyện từ vựng tiếng Anh theo tiêu chuẩn CEFR A1–B1.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hoverable className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Word Blaster Arcade
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Trò chơi bắn mục tiêu 2 chế độ: Nhìn từ tiếng Anh gõ nhanh phản xạ hoặc nhìn nghĩa tiếng Việt để tự nhớ từ tiếng Anh.
            </p>
            <div className="pt-2">
              <Link
                href={`/sets/${sampleSet.id}/arcade`}
                className="inline-flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                <span>Trải nghiệm game</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </Card>

          <Card hoverable className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Flashcard & Luyện tập thông minh
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Lật thẻ với phiên âm IPA chuẩn, ví dụ ngữ cảnh thực tế và chế độ kiểm tra câu hỏi 4 lựa chọn không gây nhầm lẫn.
            </p>
            <div className="pt-2">
              <Link
                href={`/sets/${sampleSet.id}`}
                className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                <span>Xem chi tiết học phần</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </Card>

          <Card hoverable className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Bảo mật & Quyền riêng tư
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Khám phá không hiển thị thông tin hay avatar người tạo thẻ. Dữ liệu cá nhân được phân quyền bảo mật tuyệt đối với RLS.
            </p>
            <div className="pt-2">
              <Link
                href="/explore"
                className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>Xem bộ thẻ công khai</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Featured Vocabulary Cards Preview */}
      <section className="py-12 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-teal-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Kho từ mẫu chuẩn hóa
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Từ vựng tiêu biểu trong hệ thống
            </h2>
          </div>
          <Link href="/explore">
            <Button variant="outline" size="sm">
              Xem tất cả ({DEMO_CARDS.length} từ)
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredCards.map((card) => (
            <Card key={card.id} hoverable className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-lg font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
                    {card.term}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {card.cefrLevel && (
                      <Badge variant="teal" size="sm">
                        {card.cefrLevel}
                      </Badge>
                    )}
                    <Badge variant="zinc" size="sm">
                      {card.partOfSpeech}
                    </Badge>
                  </div>
                </div>

                {card.ipa && (
                  <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mb-2">
                    {card.ipa}
                  </p>
                )}

                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  {card.meaningVi}
                </p>

                {card.exampleEn && (
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-800/60 text-xs space-y-1">
                    <p className="text-zinc-800 dark:text-zinc-200 italic font-serif">
                      &quot;{card.exampleEn}&quot;
                    </p>
                    {card.exampleVi && (
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {card.exampleVi}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã kiểm duyệt
                </span>
                <span>Thẻ #{card.position + 1}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
