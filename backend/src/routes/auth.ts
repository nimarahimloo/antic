import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword, signToken } from "../lib/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { toApi } from "../lib/serialize.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normPhone(raw: string): string {
  let s = String(raw || "").trim().replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  if (s.startsWith("98") && s.length >= 12) s = "0" + s.slice(2);
  s = s.replace(/\D/g, "");
  return s;
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

async function issueAuth(user: { id: string; email: string | null; role: string }) {
  const token = signToken({
    sub: user.id,
    email: user.email || "",
    role: user.role,
  });
  return { user: toApi(user), token };
}

router.post("/register", async (req, res) => {
  try {
    const body = z
      .object({
        email: z.string().optional(),
        phone: z.string().optional(),
        password: z.string().min(6),
        full_name: z.string().optional(),
      })
      .parse(req.body);

    const emailRaw = body.email?.trim() || "";
    const phoneRaw = body.phone?.trim() || "";
    if (!emailRaw && !phoneRaw) {
      throw new HttpError(400, "ایمیل یا شماره موبایل الزامی است");
    }

    let email: string | null = null;
    let phone: string | null = null;

    if (emailRaw) {
      if (!isEmail(emailRaw)) throw new HttpError(400, "ایمیل نامعتبر است");
      email = normEmail(emailRaw);
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new HttpError(409, "این ایمیل قبلاً ثبت شده است");
    }
    if (phoneRaw) {
      phone = normPhone(phoneRaw);
      if (!/^09\d{9}$/.test(phone)) {
        throw new HttpError(400, "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود");
      }
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) throw new HttpError(409, "این شماره قبلاً ثبت شده است");
    }

    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: await hashPassword(body.password),
        fullName: body.full_name || null,
        role: "user",
      },
    });
    res.status(201).json(await issueAuth(user));
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = z
      .object({
        email: z.string().optional(),
        phone: z.string().optional(),
        identifier: z.string().optional(),
        password: z.string().min(1),
      })
      .parse(req.body);

    const idRaw = (body.identifier || body.email || body.phone || "").trim();
    if (!idRaw) throw new HttpError(400, "ایمیل یا شماره موبایل را وارد کنید");

    let user = null as Awaited<ReturnType<typeof prisma.user.findFirst>>;

    if (isEmail(idRaw) || body.email) {
      const email = normEmail(body.email || idRaw);
      user = await prisma.user.findUnique({ where: { email } });
    } else {
      const phone = normPhone(body.phone || idRaw);
      user = await prisma.user.findUnique({ where: { phone } });
    }

    if (!user || !user.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, "اطلاعات ورود نادرست است");
    }
    res.json(await issueAuth(user));
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new HttpError(401, "User not found");
    res.json(toApi(user));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function frontendBase() {
  return (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
}

function apiPublicBase(req: { protocol: string; get: (h: string) => string | undefined }) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const host = req.get("host") || "localhost:3001";
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${proto}://${host}`;
}

router.get("/google", (req, res) => {
  try {
    if (!googleConfigured()) {
      const dest = `${frontendBase()}/login?error=${encodeURIComponent("ورود با گوگل پیکربندی نشده است")}`;
      return res.redirect(dest);
    }
    const returnTo = String(req.query.returnTo || "/");
    const state = Buffer.from(JSON.stringify({ returnTo }), "utf8").toString("base64url");
    const redirectUri = `${apiPublicBase(req)}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
      state,
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    if (!googleConfigured()) {
      return res.redirect(`${frontendBase()}/login?error=google_not_configured`);
    }
    const code = String(req.query.code || "");
    if (!code) throw new HttpError(400, "کد گوگل دریافت نشد");

    let returnTo = "/";
    try {
      const st = JSON.parse(Buffer.from(String(req.query.state || ""), "base64url").toString("utf8"));
      if (typeof st.returnTo === "string") returnTo = st.returnTo;
    } catch {
      /* ignore */
    }

    const redirectUri = `${apiPublicBase(req)}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new HttpError(401, "تأیید گوگل ناموفق بود");
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) throw new HttpError(401, "توکن گوگل دریافت نشد");

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) throw new HttpError(401, "پروفایل گوگل خوانده نشد");
    const profile = (await profileRes.json()) as { id?: string; email?: string; name?: string };
    if (!profile.id) throw new HttpError(401, "شناسه گوگل نامعتبر است");

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: profile.id },
          ...(profile.email ? [{ email: normEmail(profile.email) }] : []),
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email: profile.email ? normEmail(profile.email) : null,
          fullName: profile.name || null,
          passwordHash: null,
          role: "user",
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id },
      });
    }

    const { token } = await issueAuth(user);
    const destPath = user.role === "admin" ? "/admin" : returnTo.startsWith("/") ? returnTo : "/";
    const url = new URL(destPath, frontendBase() + "/");
    url.searchParams.set("access_token", token);
    res.redirect(url.toString());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطای گوگل";
    res.redirect(`${frontendBase()}/login?error=${encodeURIComponent(msg)}`);
  }
});

export default router;
