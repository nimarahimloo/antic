import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { toApi } from "../lib/serialize.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { normPhone } from "./auth.js";

const router = Router();
router.use(requireAuth);

function mapOrder(o: {
  id: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  itemsJson: string;
  amountToman: number;
  refId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  let items: unknown[] = [];
  try {
    items = JSON.parse(o.itemsJson);
  } catch {
    items = [];
  }
  return {
    id: o.id,
    status: o.status,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    customerAddress: o.customerAddress,
    amountToman: o.amountToman,
    refId: o.refId,
    note: o.note,
    items,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

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

    const orderWhere = {
      OR: [
        { userId: user.id },
        ...(phone ? [{ customerPhone: phone }] : []),
        ...(email ? [{ customerEmail: email }] : []),
      ],
    };

    const [orderCount, paidCount, addressCount, recentOrders, requests] = await Promise.all([
      prisma.order.count({ where: orderWhere }),
      prisma.order.count({ where: { ...orderWhere, status: "paid" } }),
      prisma.address.count({ where: { userId: user.id } }),
      prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
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
        orders: orderCount,
        paidOrders: paidCount,
        addresses: addressCount,
        requests: requests.length,
      },
      recentOrders: recentOrders.map(mapOrder),
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
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/orders", async (req: AuthedRequest, res) => {
  try {
    const user = await loadUser(req);
    const phone = user.phone || undefined;
    const email = user.email || undefined;
    const rows = await prisma.order.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(phone ? [{ customerPhone: phone }] : []),
          ...(email ? [{ customerEmail: email }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(rows.map(mapOrder));
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/orders/:id", async (req: AuthedRequest, res) => {
  try {
    const user = await loadUser(req);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "سفارش پیدا نشد");
    const owns =
      order.userId === user.id ||
      (user.phone && order.customerPhone === user.phone) ||
      (user.email && order.customerEmail === user.email);
    if (!owns) throw new HttpError(403, "دسترسی به این سفارش ندارید");
    res.json(mapOrder(order));
  } catch (err) {
    sendError(res, err);
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
      where: { id: req.params.id, userId: req.user!.sub },
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
      where: { id: req.params.id, userId: req.user!.sub },
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
