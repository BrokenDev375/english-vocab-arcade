import React from "react";
import { Sparkles, Info } from "lucide-react";

export const DemoBanner: React.FC = () => {
  return (
    <aside
      aria-label="Thông báo chế độ thử nghiệm"
      className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs font-medium"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-bold text-[10px] uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> BẢN THỬ NGHIỆM
          </span>
          <span>
            Luyện tiếng Anh A1–B1. Nội dung mẫu và nội dung AI cần được kiểm tra khi sử dụng.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-[11px]">
          <Info className="w-3.5 h-3.5" />
          <span>Đăng nhập để đồng bộ tiến độ; chế độ khách lưu trên trình duyệt.</span>
        </div>
      </div>
    </aside>
  );
};
