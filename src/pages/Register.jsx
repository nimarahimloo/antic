import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

function postLoginPath(user, returnTo) {
  if (user?.role === "admin") return "/admin";
  return returnTo || "/";
}

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() && !phone.trim()) {
      setError("حداقل ایمیل یا شماره موبایل را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.auth.register({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        full_name: fullName.trim() || undefined,
      });
      window.location.href = postLoginPath(res?.user, returnTo);
    } catch (err) {
      setError(err.message || "ثبت‌نام ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="ثبت‌نام"
      subtitle="با ایمیل، موبایل یا گوگل حساب بسازید"
      footer={
        <>
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link
            to={"/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            ورود
          </Link>
        </>
      }
    >
      <Button variant="outline" className="mb-6 h-12 w-full text-sm font-medium" onClick={handleGoogle} type="button">
        <GoogleIcon className="ml-2 h-5 w-5" />
        ثبت‌نام با گوگل
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">یا</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div>
          <Label htmlFor="fullName">نام (اختیاری)</Label>
          <Input id="fullName" className="mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">شماره موبایل</Label>
          <Input
            id="phone"
            type="tel"
            dir="ltr"
            className="mt-1.5 text-left"
            placeholder="09123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">ایمیل</Label>
          <Input
            id="email"
            type="email"
            dir="ltr"
            className="mt-1.5 text-left"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">رمز عبور (حداقل ۶ کاراکتر)</Label>
          <Input
            id="password"
            type="password"
            className="mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <p className="font-body text-[11px] text-muted-foreground">حداقل یکی از ایمیل یا موبایل کافی است.</p>
        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد حساب"}
        </Button>
      </form>
    </AuthLayout>
  );
}
