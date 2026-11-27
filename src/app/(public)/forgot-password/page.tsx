"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { api } from "@/api";
import { apiErrorMessage } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { AuthPageSkeleton } from "@/components/Skeletons";

function ForgotPasswordPageContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.requestPasswordReset(email);
    } catch (err) {
      // Intentionally do not reveal whether the email exists (security).
      console.error("Forgot password request failed:", apiErrorMessage(err));
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="بازیابی رمز عبور"
      subtitle="لینک بازیابی به ایمیل شما ارسال خواهد شد"
      footer={
        <Link href="/login" className="text-primary font-medium hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> بازگشت به ورود
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-foreground text-center font-body">
          اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز عبور به‌زودی ارسال خواهد شد.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">آدرس ایمیل</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                در حال ارسال...
              </>
            ) : (
              "ارسال لینک بازیابی"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton title="بازیابی رمز عبور" />}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
