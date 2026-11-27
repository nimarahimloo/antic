"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE } from "@/api/constants";
import { ApiError } from "@/api/types";

const TOKEN_KEY = "antic_access_token";

// Use absolute backend URL for server-side rendering (build time)
const SERVER_API_BASE = process.env.BACKEND_INTERNAL_URL || API_BASE;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Use absolute URL for server-side calls to avoid relative URL issues during build
  const baseUrl = process.env.BACKEND_INTERNAL_URL ? SERVER_API_BASE : API_BASE;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    // Network error (e.g., backend not running during build) - return empty data
    console.warn(`Server action fetch failed for ${path}:`, error);
    return undefined as T;
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    let message: string;
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as Record<string, unknown>).error === "string"
    ) {
      message = (data as Record<string, unknown>).error as string;
    } else {
      message = `HTTP ${res.status}`;
    }

    if (res.status === 401) {
      cookieStore.delete(TOKEN_KEY);
    }

    throw new ApiError(message, {
      status: res.status,
      data,
      requestId: (data as Record<string, unknown>)?.requestId as string | undefined,
    });
  }

  return data as T;
}

export async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const identifier = formData.get("identifier") as string;
  const password = formData.get("password") as string;

  if (!identifier || !password) {
    return { error: "ایمیل/شماره موبایل و رمز عبور الزامی است" };
  }

  try {
    const body: Record<string, unknown> = { password };
    if (identifier.includes("@")) body.email = identifier;
    else body.phone = identifier;
    body.identifier = identifier;

    const res = await request<{ user: unknown; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (res?.token) {
      const cookieStore = await cookies();
      cookieStore.set(TOKEN_KEY, res.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: "خطای ناشناخته در ورود" };
  }
}

export async function registerAction(
  prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  if ((!email && !phone) || !password) {
    return { error: "ایمیل یا شماره موبایل و رمز عبور الزامی است" };
  }

  try {
    const body: Record<string, unknown> = { password };
    if (email) body.email = email;
    if (phone) body.phone = phone;
    if (fullName) body.full_name = fullName;

    const res = await request<{ user: unknown; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (res?.token) {
      const cookieStore = await cookies();
      cookieStore.set(TOKEN_KEY, res.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: "خطای ناشناخته در ثبت‌نام" };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  if (token) {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Ignore server logout errors
    }
  }

  cookieStore.delete(TOKEN_KEY);
  redirect("/");
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  if (!token) return null;

  try {
    const user = await request<{ id: string; email: string | null; full_name: string; role: string }>("/auth/me");
    return user;
  } catch {
    cookieStore.delete(TOKEN_KEY);
    return null;
  }
}

export async function refreshSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  if (!token) return null;

  try {
    const user = await request<{ id: string; email: string | null; full_name: string; role: string }>("/auth/me");
    return user;
  } catch {
    cookieStore.delete(TOKEN_KEY);
    return null;
  }
}