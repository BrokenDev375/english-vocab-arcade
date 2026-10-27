"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Vui lòng nhập địa chỉ email của bạn.");
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Không thể gửi yêu cầu đặt lại mật khẩu.");
      }

      setSuccessMessage(
        data.message ||
          "Đường dẫn đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hòm thư của bạn."
      );
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
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
          Quên mật khẩu?
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Nhập địa chỉ email đăng ký để nhận liên kết khôi phục mật khẩu tài khoản
        </p>
      </div>

      {successMessage ? (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="forgot-email"
            label="Địa chỉ Email"
            type="email"
            placeholder="ten@vidu.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            Gửi liên kết khôi phục
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

export default function ForgotPasswordPage() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto py-8 sm:py-12">
        <Suspense fallback={<div className="h-80 w-full animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
