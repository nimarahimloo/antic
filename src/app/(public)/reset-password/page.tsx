"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/api";
import { apiErrorMessage } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { AuthPageSkeleton } from "@/components/Skeletons";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("رمزهای عبور یکسان نیستند");
      return;
    }
    if (newPassword.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(resetToken, newPassword);
      router.push("/login?reset=1");
      router.refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="لینک بازیابی نامعتبر"
        subtitle="این لینک بازیابی ناقص یا نامعتبر است"
        footer={
          <Link href="/forgot-password" className="text-primary font-medium hover:underline">
            درخواست لینک جدید
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          لینکی که استفاده کردید ناقص به نظر می‌رسد. لطفاً یک لینک بازیابی جدید درخواست کنید.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Lock} title="رمز عبور جدید" subtitle="رمز عبور جدید خود را وارد کنید">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">رمز عبور جدید</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="حداقل ۸ کاراکتر"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-12"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="رمز عبور را دوباره وارد کنید"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12"
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              در حال ذخیره...
            </>
          ) : (
            "ذخیره رمز عبور"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton title="تنظیم رمز جدید" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
