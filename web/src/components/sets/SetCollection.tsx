"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Globe,
  Layers,
  Lock,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SetSummary {
  id: string;
  title: string;
  description: string;
  cefr_level: string;
  topic: string;
  card_count: number;
  is_public: boolean;
}
interface CollectionResult {
  rows: SetSummary[];
  page: number;
  total: number;
  totalPages: number;
}
export function SetCollection({
  scope,
  initialQuery = "",
}: {
  scope: "explore" | "user";
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [level, setLevel] = useState("ALL");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CollectionResult>({
    rows: [],
    page: 1,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          scope,
          search,
          level,
          page: String(page),
          pageSize: "12",
        });
        const response = await fetch(`/api/sets?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            "Không tải được danh sách học phần. Vui lòng thử lại.",
          );
        const json = await response.json();
        if (!controller.signal.aborted)
          setResult({ rows: json.data, ...json.meta });
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tải được học phần.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [scope, search, level, page, retry]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSearch(query.trim());
    setPage(1);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          role="search"
          aria-label="Lọc danh sách học phần"
          onSubmit={submit}
          className="flex flex-1 gap-2"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              aria-label="Tìm trong danh sách học phần"
              placeholder="Tìm học phần hoặc chủ đề..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <Button type="submit" size="sm">
            Tìm kiếm
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="sr-only">Trình độ</span>
          <select
            aria-label="Trình độ"
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="ALL">Tất cả trình độ</option>
            <option value="A1">A1 — Cơ bản</option>
            <option value="A2">A2 — Sơ cấp</option>
            <option value="B1">B1 — Trung cấp</option>
            <option value="mixed">Hỗn hợp</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">
          {scope === "explore" ? "Học phần nổi bật" : "Học phần của tôi"}
        </h2>
        <span className="text-sm text-zinc-400">
          {loading ? "Đang tải..." : `${result.total} học phần`}
        </span>
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 p-5 text-sm text-rose-600"
        >
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Đang tải học phần</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : result.rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.rows.map((set) => (
            <Link
              key={set.id}
              href={`/sets/${set.id}`}
              className="group flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:bg-zinc-800">
                  {set.card_count} thuật ngữ
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                  {set.cefr_level}
                </span>
              </div>
              <h3 className="break-words text-lg font-extrabold group-hover:text-indigo-600">
                {set.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                {set.description || set.topic}
              </p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                  {scope === "user" ? (
                    set.is_public ? (
                      <>
                        <Globe className="size-3" />
                        Công khai
                      </>
                    ) : (
                      <>
                        <Lock className="size-3" />
                        Riêng tư
                      </>
                    )
                  ) : (
                    <>
                      <Layers className="size-3" />
                      {set.topic}
                    </>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                  Học ngay
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <BookOpen className="mx-auto size-10 text-zinc-300" />
          <p className="font-bold">
            {search || level !== "ALL"
              ? "Không tìm thấy học phần phù hợp"
              : scope === "user"
                ? "Thư viện của bạn chưa có học phần"
                : "Chưa có học phần công khai"}
          </p>
          <p className="text-sm text-zinc-500">
            {search || level !== "ALL"
              ? "Thử đổi từ khóa hoặc trình độ."
              : "Tạo bộ thẻ đầu tiên và bắt đầu học theo cách của bạn."}
          </p>
          <Link
            href="/sets/new"
            className="inline-block text-sm font-semibold text-indigo-600"
          >
            Tạo học phần mới
          </Link>
        </div>
      )}
      {!error && result.totalPages > 1 && (
        <nav
          aria-label="Phân trang học phần"
          className="flex items-center justify-center gap-4"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <ArrowLeft className="size-4" />
            Trước
          </Button>
          <span className="text-sm text-zinc-500">
            Trang {page} / {result.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= result.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Sau
            <ArrowRight className="size-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
