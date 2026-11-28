"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, ExternalLink } from "lucide-react";
import Link from "next/link";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  returnTo?: string;
}

/**
 * LoginModal — appears when the admin token expires (401/403) while the user
 * is on an admin page. Prompts the user to log in again without leaving the
 * current page. On successful login, the modal closes and the page can
 * re-fetch its data. If the user closes the modal without logging in, they
 * are redirected to the login page.
 */
export function LoginModal({
  open,
  onClose,
  onSuccess,
  returnTo = "/admin",
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ورود ناموفق بود. لطفاً دوباره تلاش کنید."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    // If the user closes the modal (Escape, backdrop click) without logging in,
    // redirect to the login page. If they just logged in, isAuthenticated is true
    // and no redirect happens.
    if (!isAuthenticated) {
      api.auth.redirectToLogin(returnTo);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md w-full p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            ورود به پنل مدیریت
          </DialogTitle>
          <DialogDescription>
            توکن دسترسی شما منقضی شده است. لطفاً دوباره وارد شوید تا به پنل مدیریت دسترسی داشته باشید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="login-modal-email">ایمیل</Label>
            <Input
              id="login-modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="شما@example.com"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="login-modal-password">رمز عبور</Label>
            <Input
              id="login-modal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={loading}
          >
            {loading ? "در حال ورود..." : "ورود به سیستم"}
          </Button>
        </form>

        <DialogFooter>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p className="font-body">
              حسابی ندارید؟{" "}
              <Link href="/register" className="font-semibold text-primary underline hover:no-underline">
                ثبت‌نام
              </Link>
            </p>
            <Link
              href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="flex items-center gap-1 font-semibold text-primary underline hover:no-underline"
            >
              صفحه ورود کامل <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Trigger-less wrapper — LoginModal is opened programmatically via the `open`
 * prop, not via DialogTrigger. We render a hidden trigger for Radix compatibility.
 */
export function LoginModalWrapper({
  open,
  onClose,
  onSuccess,
  returnTo,
}: LoginModalProps) {
  return (
    <>
      <DialogTrigger asChild>
        <button style={{ display: "none" }} />
      </DialogTrigger>
      <LoginModal open={open} onClose={onClose} onSuccess={onSuccess} returnTo={returnTo} />
    </>
  );
}