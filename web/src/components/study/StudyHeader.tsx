import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";

export function StudyHeader({
  setId,
  title,
  subtitle,
  current,
  total,
}: {
  setId: string;
  title: string;
  subtitle?: string;
  current?: number;
  total?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/sets/${setId}`}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-indigo-600"
          >
            <ArrowLeft className="size-4" />
            Quay lại học phần
          </Link>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {total !== undefined && current !== undefined && total > 0 && (
          <span className="mt-9 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-300">
            <Layers className="size-3.5" />
            {current} / {total}
          </span>
        )}
      </div>
      {total !== undefined && current !== undefined && total > 0 && (
        <div
          role="progressbar"
          aria-label="Tiến độ bài học"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${Math.min(100, (current / total) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
