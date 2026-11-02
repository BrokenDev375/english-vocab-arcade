"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { flushStudySessions } from "@/features/study/session-sync";
import { useStudyIdentity } from "@/components/auth/AuthProvider";
import { clearUserLocalData } from "@/features/study/study-client-adapter";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function Navbar() {
  const identity = useStudyIdentity();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = identity.userId !== "guest";
  const search = (event: FormEvent) => {
    event.preventDefault();
    setOpen(false);
    router.push(
      query.trim()
        ? `/explore?q=${encodeURIComponent(query.trim())}`
        : "/explore",
    );
  };
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await flushStudySessions()))
        throw new Error(
          "Tiến độ chưa đồng bộ xong. Hãy kiểm tra kết nối rồi đăng xuất lại.",
        );
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Chưa đăng xuất được. Hãy thử lại.");
      window.dispatchEvent(new Event("eva-auth-leaving"));
      clearUserLocalData(identity.userId);
      await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
      setOpen(false);
      router.push("/login");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Chưa đăng xuất được. Hãy thử lại.",
      );
    } finally {
      setBusy(false);
    }
  };
  const navClass = (href: string) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === href ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"}`;
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Vocab Arcade — Trang chủ"
          className="flex shrink-0 items-center gap-2.5"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="size-5" />
          </span>
          <span className="block">
            <span className="block bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-base font-black tracking-tight text-transparent sm:text-lg">
              Vocab Arcade
            </span>
            <span className="block text-[10px] font-medium text-zinc-500">
              Tiếng Anh A1–B1
            </span>
          </span>
        </Link>
        <nav
          aria-label="Menu chính"
          className="hidden shrink-0 items-center lg:flex"
        >
          <Link href="/explore" className={navClass("/explore")}>
            <Compass className="size-4" />
            Khám phá
          </Link>
          {signedIn && (
            <Link href="/dashboard" className={navClass("/dashboard")}>
              <LayoutDashboard className="size-4" />
              Thư viện của tôi
            </Link>
          )}
        </nav>
        <form
          role="search"
          aria-label="Tìm học phần"
          onSubmit={search}
          className="relative mx-1 hidden max-w-md flex-1 sm:block"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            aria-label="Tìm kiếm học phần"
            placeholder="Tìm kiếm học phần, chủ đề..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-full border border-zinc-200 bg-zinc-100/70 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:bg-zinc-950"
          />
        </form>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/sets/new"
            aria-label="Tạo học phần"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-blue-700 sm:px-4"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Tạo học phần</span>
          </Link>
          {signedIn ? (
            <>
              <Link
                href="/dashboard"
                aria-label="Thư viện cá nhân"
                className="hidden size-8 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 md:flex dark:border-indigo-800 dark:bg-indigo-950"
              >
                <UserRound className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                disabled={busy}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="rounded-lg p-2 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="rounded-lg px-2 py-2 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Đăng nhập
              </Link>
              <Link
                href="/signup"
                className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-600 dark:border-indigo-800 dark:text-indigo-300"
              >
                Đăng ký
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Menu di động"
          className="space-y-3 border-t border-zinc-200 bg-white p-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-950"
        >
          <form
            role="search"
            aria-label="Tìm học phần trên điện thoại"
            onSubmit={search}
            className="flex gap-2"
          >
            <input
              type="search"
              aria-label="Tìm kiếm học phần trên điện thoại"
              placeholder="Tìm kiếm học phần..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            />
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white"
            >
              Tìm
            </button>
          </form>
          <Link
            href="/explore"
            onClick={() => setOpen(false)}
            className={navClass("/explore")}
          >
            <Compass className="size-4" />
            Khám phá
          </Link>
          {signedIn && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={navClass("/dashboard")}
            >
              <LayoutDashboard className="size-4" />
              Thư viện của tôi
            </Link>
          )}
          {!signedIn && (
            <div className="flex gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Đăng nhập
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      )}
      {error && (
        <p
          role="alert"
          className="border-t border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          {error}
        </p>
      )}
    </header>
  );
}
