"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Compass, LayoutDashboard, Menu, X, BookOpen, LogIn, UserPlus } from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Trang chủ", icon: BookOpen },
    { href: "/explore", label: "Khám phá", icon: Compass },
    { href: "/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
    { href: "/sets/d0000000-0001-4000-8000-000000000001/arcade", label: "Word Blaster", icon: Gamepad2 },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 dark:from-teal-500 dark:to-teal-300 flex items-center justify-center text-white dark:text-zinc-950 shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight font-extrabold text-base bg-gradient-to-r from-zinc-900 via-teal-800 to-zinc-900 dark:from-zinc-100 dark:via-teal-300 dark:to-zinc-100 bg-clip-text text-transparent">
                Vocab Arcade
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                Tiếng Anh A1–B1
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Menu chính">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-teal-600 dark:text-teal-400" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth CTAs */}
          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-zinc-950 shadow-sm transition-all shadow-teal-600/20 active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Bắt đầu học</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Mở menu điều hướng"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium ${
                  active
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-5 h-5 text-teal-500" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-teal-600 text-white dark:bg-teal-500 dark:text-zinc-950"
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng ký miễn phí</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
