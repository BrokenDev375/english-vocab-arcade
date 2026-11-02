import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Gamepad2,
  Layers,
  Plus,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";

const features = [
  {
    icon: Layers,
    title: "Thẻ ghi nhớ",
    text: "Lật thẻ, nghe phát âm tiếng Anh và học từ qua ví dụ. Đánh dấu những từ đã nhớ để ôn tập thuận tiện.",
    color: "bg-indigo-500/10 text-indigo-600",
  },
  {
    icon: Brain,
    title: "Chế độ Học",
    text: "Luyện trắc nghiệm, gõ đáp án và ôn lại những từ còn nhầm. Tiếp tục đúng vị trí khi quay lại học.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Trophy,
    title: "Kiểm tra",
    text: "Tự kiểm tra vốn từ, xem kết quả và dành thêm thời gian cho các từ chưa thuộc.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Gamepad2,
    title: "Ghép thẻ",
    text: "Ghép từ với nghĩa qua từng chặng. Học hết bộ từ trong một lượt, mỗi thẻ xuất hiện một lần.",
    color: "bg-orange-500/10 text-orange-600",
  },
];
export default function HomePage() {
  const sample = DEMO_SETS[0];
  const sampleCard = sample.cards?.[0] || DEMO_CARDS[0];
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl px-4 py-12 text-center sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 -z-0 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/10 via-blue-400/10 to-purple-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-300">
            <Sparkles className="size-3.5" />
            Không gian học tiếng Anh của bạn
          </span>
          <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Học từ vựng dễ hơn cùng{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              thẻ ghi nhớ
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-500 sm:text-lg">
            Tạo học phần của riêng bạn, luyện nghe nói và ghi nhớ từ vựng tiếng
            Anh A1–B1. Một bộ thẻ, nhiều cách học mỗi ngày.
          </p>
          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Link
              href="/sets/new"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-blue-700"
            >
              <Plus className="size-5" />
              Tạo học phần miễn phí
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3.5 font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <BookOpen className="size-5" />
              Khám phá kho học phần
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl items-center gap-8 py-10 md:grid-cols-2">
        <Link
          href={`/sets/${sample.id}`}
          aria-label="Học thử bộ thẻ mẫu"
          className="group relative block rounded-2xl border border-indigo-200 bg-white p-8 text-center shadow-xl shadow-indigo-500/10 transition hover:-translate-y-1 dark:border-indigo-900 dark:bg-zinc-900"
        >
          <span className="absolute left-5 top-4 text-xs font-semibold text-zinc-400">
            THẺ GHI NHỚ · TIẾNG ANH
          </span>
          <Layers className="mx-auto mb-4 mt-5 size-8 text-indigo-500" />
          <span className="block text-4xl font-black">{sampleCard.term}</span>
          <span className="mt-2 block font-mono text-sm text-zinc-400">
            {sampleCard.ipa}
          </span>
          <span className="mt-5 block text-xl font-semibold text-indigo-600 dark:text-indigo-300">
            {sampleCard.meaningVi}
          </span>
          <span className="mt-6 inline-flex items-center gap-1 text-xs text-zinc-500">
            Học thử bộ thẻ mẫu
            <ArrowRight className="size-3.5" />
          </span>
        </Link>
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Từ một học phần đến cả hành trình học
          </h2>
          <p className="leading-relaxed text-zinc-500">
            Thêm từ, nghĩa tiếng Việt, phiên âm IPA và câu ví dụ. Chọn cách học
            phù hợp ngay trên trang học phần của bạn.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Nhập nhanh danh sách từ từ CSV hoặc Excel",
              "Ôn thẻ và tiếp tục tiến độ học đã lưu",
              "Luyện nghe, nói, đọc hiểu và dịch theo ngữ cảnh",
            ].map((text) => (
              <li key={text} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-indigo-500" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="space-y-7 border-t border-zinc-200 py-12 dark:border-zinc-800">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Chọn cách học phù hợp với bạn
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Những chế độ quen thuộc, cùng mục tiêu ghi nhớ từ vựng lâu hơn.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text, color }) => (
            <div
              key={title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span
                className={`mb-4 flex size-11 items-center justify-center rounded-xl ${color}`}
              >
                <Icon className="size-6" />
              </span>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold">
            <Zap className="size-6 text-amber-500" />
            Word Blaster
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
            Thêm một cách ôn từ thật vui: gõ từ tiếng Anh để bắn mục tiêu. Chọn
            nhìn từ gõ nhanh hoặc nhìn nghĩa để tự nhớ đáp án.
          </p>
          <p className="text-xs text-zinc-500">
            Bản chơi thử dùng bộ từ mẫu, tách biệt với học phần của bạn.
          </p>
        </div>
        <Link
          href={`/sets/${sample.id}/arcade`}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-500 px-6 py-3 font-bold text-zinc-950 hover:bg-amber-400"
        >
          <Gamepad2 className="size-5" />
          Chơi thử Word Blaster
        </Link>
      </section>
    </AppShell>
  );
}
