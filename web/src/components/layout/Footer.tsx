import React from "react";
import Link from "next/link";
import { Gamepad2, ShieldCheck, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/80 text-zinc-600 dark:text-zinc-400 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white dark:text-zinc-950">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                English Vocab Arcade
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              Nền tảng học từ vựng và câu tiếng Anh A1–B1 dành riêng cho người Việt. Kết hợp phương pháp lặp lại ngắt quãng và minigame gõ từ phản xạ.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Bảo mật dữ liệu riêng tư & kiến trúc RLS</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 mb-3">
              Chế độ học
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/explore" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Khám phá bộ từ
                </Link>
              </li>
              <li>
                <Link href="/sets/d0000000-0001-4000-8000-000000000001/arcade" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Word Blaster (Arcade)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                  Tiến độ cá nhân
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 mb-3">
              Thông tin
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-zinc-500 dark:text-zinc-400">Khung tham chiếu CEFR A1–B1</span>
              </li>
              <li>
                <span className="text-zinc-500 dark:text-zinc-400">Không quảng cáo & không theo dõi</span>
              </li>
              <li>
                <span className="text-zinc-500 dark:text-zinc-400">Phiên bản beta 1.0 (2026)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-500">
          <p>© 2026 English Vocab Arcade. Thiết kế và phát triển độc lập.</p>
          <p className="flex items-center gap-1">
            Xây dựng với <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> cho người học tiếng Anh Việt Nam.
          </p>
        </div>
      </div>
    </footer>
  );
};
