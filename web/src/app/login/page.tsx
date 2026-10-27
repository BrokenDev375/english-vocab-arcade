"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LogIn, Gamepad2, Info } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: nextTarget }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập không thành công");
      }

      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
          <Gamepad2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
          Đăng nhập tài khoản
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Đăng nhập để lưu tiến độ học tập và đồng bộ điểm Word Blaster
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="login-email"
          label="Địa chỉ Email"
          type="email"
          placeholder="ten@vidu.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />

        <Input
          id="login-password"
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />

        {error && (
          <p className="text-xs text-rose-500 font-medium" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
        >
          <LogIn className="w-4 h-4 mr-1.5" />
          Đăng nhập
        </Button>
      </form>

      <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
        <span>
          Bảo mật SSR: Xác thực cookie và RLS phân quyền theo người dùng.
        </span>
      </div>

      <div className="text-center text-xs text-zinc-500">
        Chưa có tài khoản?{" "}
        <Link
          href="/signup"
          className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
        >
          Đăng ký miễn phí
        </Link>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto py-8 sm:py-12">
        <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />}>
          <LoginForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
