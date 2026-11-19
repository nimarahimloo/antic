"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import PageHero from "@/components/PageHero";
import PageLoading from "@/components/PageLoading";

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, fullName);
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت‌نام ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <PageHero
        pageKey="register"
        eyebrow="ثبت‌نام"
        title="حساب کاربری بسازید"
        description="برای سفارش، پیگیری و مدیریت آدرس‌ها، عضو شوید."
      />

      <section className="mx-auto max-w-md px-5 py-12 lg:px-10 lg:py-16">
        <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="mb-1.5 block font-body text-xs text-muted-foreground">نام و نام خانوادگی</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                placeholder="مثال: سارا محمدی"
                required
                autoComplete="name"
              />
            </div>
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
                placeholder="حداقل ۸ کاراکتر"
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center" style={{ minHeight: 48 }}>
              {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-muted-foreground">
              قبلاً ثبت‌نام کرده‌اید؟{" "}
              <Link href="/login" className="font-semibold text-primary underline hover:no-underline">
                ورود
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
