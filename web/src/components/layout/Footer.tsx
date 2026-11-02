import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-zinc-200 bg-white py-10 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-black text-indigo-600 dark:text-indigo-300"
          >
            <Sparkles className="size-5" />
            Vocab Arcade
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            Tạo học phần, ôn từ vựng và luyện các kỹ năng tiếng Anh A1–B1 theo
            cách của bạn.
          </p>
        </div>
        <nav aria-label="Liên kết cuối trang" className="space-y-3 text-sm">
          <p className="font-bold">Không gian học tập</p>
          <Link
            href="/explore"
            className="block text-zinc-500 hover:text-indigo-600"
          >
            Khám phá học phần
          </Link>
          <Link
            href="/dashboard"
            className="block text-zinc-500 hover:text-indigo-600"
          >
            Thư viện của tôi
          </Link>
          <Link
            href="/sets/new"
            className="block text-zinc-500 hover:text-indigo-600"
          >
            Tạo học phần mới
          </Link>
        </nav>
        <div className="space-y-3 text-sm">
          <p className="font-bold">Học mỗi ngày một chút</p>
          <p className="leading-relaxed text-zinc-500">
            Thẻ ghi nhớ, học thích ứng, kiểm tra, ghép thẻ và Word Blaster trong
            cùng một học phần.
          </p>
          <p className="text-xs text-zinc-400">© 2026 English Vocab Arcade</p>
        </div>
      </div>
    </footer>
  );
}
