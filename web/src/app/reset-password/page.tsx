"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ cả hai trường mật khẩu.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Không thể đặt lại mật khẩu.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(data.redirectTo || "/dashboard");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
          Đặt lại mật khẩu
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Nhập mật khẩu mới cho tài khoản của bạn (tối thiểu 8 ký tự)
        </p>
      </div>

      {success ? (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Mật khẩu đã được cập nhật thành công! Đang chuyển hướng...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="reset-new-password"
            label="Mật khẩu mới"
            type="password"
            placeholder="Tối thiểu 8 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          <Input
            id="reset-confirm-password"
            label="Xác nhận mật khẩu mới"
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
          >
            Lưu mật khẩu mới
          </Button>
        </form>
      )}

      <div className="text-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại trang Đăng nhập</span>
        </Link>
      </div>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto py-8 sm:py-12">
        <Suspense fallback={<div className="h-80 w-full animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
