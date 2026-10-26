import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

function postLoginPath(user, returnTo) {
  if (user?.role === "admin") return "/admin";
  return returnTo || "/";
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(err);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.auth.login(identifier.trim(), password);
      window.location.href = postLoginPath(res?.user, returnTo);
    } catch (err) {
      setError(err.message || "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="ورود"
      subtitle="با ایمیل، موبایل یا حساب گوگل وارد شوید"
      footer={
        <>
          حساب ندارید؟{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            ثبت‌نام
          </Link>
        </>
      }
    >
      <Button variant="outline" className="mb-6 h-12 w-full text-sm font-medium" onClick={handleGoogle} type="button">
        <GoogleIcon className="ml-2 h-5 w-5" />
        ادامه با گوگل
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
          <Label htmlFor="identifier">ایمیل یا شماره موبایل</Label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            dir="ltr"
            className="mt-1.5 text-left"
            placeholder="09xxxxxxxxx یا email@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">رمز عبور</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-between text-xs">
          <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">
            فراموشی رمز؟
          </Link>
        </div>
        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ورود"}
        </Button>
      </form>
    </AuthLayout>
  );
}
