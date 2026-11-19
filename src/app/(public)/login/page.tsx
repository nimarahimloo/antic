"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import PageHero from "@/components/PageHero";
import PageLoading from "@/components/PageLoading";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <PageHero
        pageKey="login"
        eyebrow="ورود"
        title="به حساب خود وارد شوید"
        description="برای دسترسی به سفارش‌ها، آدرس‌ها و تنظیمات، لاگین کنید."
      />

      <section className="mx-auto max-w-md px-5 py-12 lg:py-16">
        <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block font-body text-xs text-muted-foreground">ایمیل</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                placeholder="شما@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block font-body text-xs text-muted-foreground">رمز عبور</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                placeholder="********"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center" style={{ minHeight: 48 }}>
              {loading ? "در حال ورود..." : "ورود"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              حسابی ندارید؟{" "}
              <Link href="/register" className="font-semibold text-primary underline hover:no-underline">
                ثبت‌نام
              </Link>
            </p>
            <p className="mt-2 font-body text-xs text-muted-foreground">
              <Link href="/forgot-password" className="font-semibold text-primary underline hover:no-underline">
                رمز عبور را فراموش کرده‌اید؟
              </Link>
            </p>
            <p className="mt-4 font-body text-xs text-muted-foreground">
              یا با{" "}
              <a href="/auth/google" className="font-semibold text-primary underline hover:no-underline">
                Google
              </a>
              {" وارد شوید"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginForm />
    </Suspense>
  );
}
