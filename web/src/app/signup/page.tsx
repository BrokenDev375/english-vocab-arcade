"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { UserPlus, Gamepad2, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Đăng ký không thành công");
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setSuccessMessage(
          "Tài khoản đã được tạo thành công! Vui lòng kiểm tra hộp thư email để xác nhận tài khoản trước khi đăng nhập."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-md mx-auto py-8 sm:py-12">
        <Card className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">
              Tạo tài khoản mới
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Bắt đầu hành trình chinh phục từ vựng tiếng Anh A1–B1 hoàn toàn miễn phí
            </p>
          </div>

          {successMessage ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Đăng ký thành công</span>
              </div>
              <p className="text-xs leading-relaxed">{successMessage}</p>
              <div className="pt-2">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full">
                    Đến trang đăng nhập
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="signup-name"
                label="Tên hiển thị (Tùy chọn)"
                type="text"
                placeholder="VD: Minh Anh"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />

              <Input
                id="signup-email"
                label="Địa chỉ Email"
                type="email"
                placeholder="ten@vidu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />

              <Input
                id="signup-password"
                label="Mật khẩu"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />

              <Input
                id="signup-confirm-password"
                label="Xác nhận mật khẩu"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                <UserPlus className="w-4 h-4 mr-1.5" />
                Đăng ký ngay
              </Button>
            </form>
          )}

          <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
            <span>
              Chúng tôi tôn trọng quyền riêng tư. Hồ sơ cá nhân không bị công khai trên trang Khám phá.
            </span>
          </div>

          <div className="text-center text-xs text-zinc-500">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Đăng nhập tại đây
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
