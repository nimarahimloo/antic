import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { routeParam } from "../lib/routeParams.js";
import { toApi } from "../lib/serialize.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { normPhone } from "./auth.js";
import { sendMail } from "../lib/mailer.js";
import { emailChangedEmail, passwordChangedEmail } from "../lib/emailTemplates.js";

const router = Router();
router.use(requireAuth);

async function loadUser(req: AuthedRequest) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) throw new HttpError(401, "کاربر یافت نشد");
  return user;
}

router.get("/overview", async (req: AuthedRequest, res) => {
  try {
    const user = await loadUser(req);
    const phone = user.phone || undefined;
    const email = user.email || undefined;

    const [addressCount, requests] = await Promise.all([
      prisma.address.count({ where: { userId: user.id } }),
      phone || email
        ? prisma.consultationRequest.findMany({
            where: {
              OR: [
                ...(phone ? [{ phone }] : []),
                ...(email ? [{ email }] : []),
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    res.json({
      user: toApi(user),
      stats: {
        addresses: addressCount,
        requests: requests.length,
      },
      recentRequests: requests.map((r) => toApi(r)),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.patch("/profile", async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        full_name: z.string().min(2).max(80).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
      })
      .parse(req.body);

    const user = await loadUser(req);
    const data: { fullName?: string; phone?: string | null; email?: string | null } = {};

    if (body.full_name !== undefined) data.fullName = body.full_name.trim();

    if (body.phone !== undefined) {
      const phone = body.phone.trim() ? normPhone(body.phone) : null;
      if (phone && !/^09\d{9}$/.test(phone)) {
        throw new HttpError(400, "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود");
      }
      if (phone) {
        const taken = await prisma.user.findFirst({
          where: { phone, NOT: { id: user.id } },
        });
        if (taken) throw new HttpError(409, "این شماره قبلاً ثبت شده است");
      }
      data.phone = phone;
    }

    if (body.email !== undefined) {
      const email = body.email.trim() ? body.email.trim().toLowerCase() : null;
      if (email) {
        const taken = await prisma.user.findFirst({
          where: { email, NOT: { id: user.id } },
        });
        if (taken) throw new HttpError(409, "این ایمیل قبلاً ثبت شده است");
      }
      data.email = email;
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });

    // Send email change notification (non-blocking)
    if (data.email && data.email !== user.email) {
      const { text, html } = emailChangedEmail(data.email, data.email);
      sendMail({
        to: data.email,
        subject: "ایمیل شما تغییر کرد — پرده آنتیک",
        text,
        html,
      }).catch(() => {});
    }

    res.json(toApi(updated));
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.post("/password", async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        current_password: z.string().min(1),
        new_password: z.string().min(6),
      })
      .parse(req.body);

    const user = await loadUser(req);
    if (!user.passwordHash) {
      throw new HttpError(400, "این حساب با گوگل ساخته شده؛ ابتدا یک رمز تعیین کنید.");
    }
    if (!(await verifyPassword(body.current_password, user.passwordHash))) {
      throw new HttpError(400, "رمز فعلی نادرست است");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.new_password) },
    });

    // Send password change notification (non-blocking)
    if (user.email) {
      const { text, html } = passwordChangedEmail(user.email, user.fullName || undefined);
      sendMail({
        to: user.email,
        subject: "رمز عبور شما تغییر کرد — پرده آنتیک",
        text,
        html,
      }).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/addresses", async (req: AuthedRequest, res) => {
  try {
    const rows = await prisma.address.findMany({
      where: { userId: req.user!.sub },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    res.json(rows.map((a) => toApi(a)));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/addresses", async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        title: z.string().optional(),
        full_name: z.string().optional(),
        phone: z.string().optional(),
        province: z.string().optional(),
        city: z.string().optional(),
        address: z.string().min(5),
        postal_code: z.string().optional(),
        is_default: z.boolean().optional(),
      })
      .parse(req.body);

    const userId = req.user!.sub;
    if (body.is_default) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const row = await prisma.address.create({
      data: {
        userId,
        title: body.title || null,
        fullName: body.full_name || null,
        phone: body.phone ? normPhone(body.phone) : null,
        province: body.province || null,
        city: body.city || null,
        address: body.address.trim(),
        postalCode: body.postal_code || null,
        isDefault: Boolean(body.is_default),
      },
    });
    res.status(201).json(toApi(row));
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.put("/addresses/:id", async (req: AuthedRequest, res) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: routeParam(req, "id"), userId: req.user!.sub },
    });
    if (!existing) throw new HttpError(404, "آدرس یافت نشد");

    const body = z
      .object({
        title: z.string().optional(),
        full_name: z.string().optional(),
        phone: z.string().optional(),
        province: z.string().optional(),
        city: z.string().optional(),
        address: z.string().min(5).optional(),
        postal_code: z.string().optional(),
        is_default: z.boolean().optional(),
      })
      .parse(req.body);

    if (body.is_default) {
      await prisma.address.updateMany({
        where: { userId: req.user!.sub },
        data: { isDefault: false },
      });
    }

    const row = await prisma.address.update({
      where: { id: existing.id },
      data: {
        title: body.title !== undefined ? body.title : existing.title,
        fullName: body.full_name !== undefined ? body.full_name : existing.fullName,
        phone: body.phone !== undefined ? (body.phone ? normPhone(body.phone) : null) : existing.phone,
        province: body.province !== undefined ? body.province : existing.province,
        city: body.city !== undefined ? body.city : existing.city,
        address: body.address !== undefined ? body.address.trim() : existing.address,
        postalCode: body.postal_code !== undefined ? body.postal_code : existing.postalCode,
        isDefault: body.is_default !== undefined ? body.is_default : existing.isDefault,
      },
    });
    res.json(toApi(row));
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.delete("/addresses/:id", async (req: AuthedRequest, res) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: routeParam(req, "id"), userId: req.user!.sub },
    });
    if (!existing) throw new HttpError(404, "آدرس یافت نشد");
    await prisma.address.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/requests", async (req: AuthedRequest, res) => {
  try {
    const user = await loadUser(req);
    if (!user.phone && !user.email) {
      return res.json([]);
    }
    const rows = await prisma.consultationRequest.findMany({
      where: {
        OR: [
          ...(user.phone ? [{ phone: user.phone }] : []),
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(rows.map((r) => toApi(r)));
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
