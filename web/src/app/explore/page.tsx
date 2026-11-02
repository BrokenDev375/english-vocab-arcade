"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SetCollection } from "@/components/sets/SetCollection";

function ExploreContent() {
  const params = useSearchParams();
  const query = params.get("q") || "";
  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <div className="mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
            <Compass className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Khám phá
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Khám phá học phần
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Tìm bộ từ tiếng Anh bạn yêu thích và bắt đầu học theo cách của mình.
          </p>
        </div>
        <SetCollection key={query} scope="explore" initialQuery={query} />
      </div>
    </AppShell>
  );
}
export default function ExplorePage() {
  return (
    <Suspense fallback={<p role="status">Đang tải danh sách học phần...</p>}>
      <ExploreContent />
    </Suspense>
  );
}
