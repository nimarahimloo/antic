import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError, sendError } from "../lib/errors.js";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

function merchantId() {
  return process.env.ZARINPAL_MERCHANT_ID || "";
}

function isSandbox() {
  const m = merchantId();
  return process.env.ZARINPAL_SANDBOX === "true" || !m;
}

function publicBase() {
  return process.env.PUBLIC_BASE_URL || "http://localhost:3001";
}

function frontBase() {
  return (
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN?.split(",")[0]?.trim() ||
    "http://localhost:5173"
  );
}

function zarinpalApi(path: string) {
  const host = isSandbox() ? "https://sandbox.zarinpal.com" : "https://api.zarinpal.com";
  return `${host}/pg/v4/payment/${path}`;
}

function startPayUrl(authority: string) {
  const host = isSandbox() ? "https://sandbox.zarinpal.com" : "https://www.zarinpal.com";
  return `${host}/pg/StartPay/${authority}`;
}

const checkoutSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        name: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        image: z.string().optional(),
      })
    )
    .min(1),
});

router.post("/checkout", async (req, res) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const amountToman = body.items.reduce(
      (s, i) => s + Math.round(i.unitPrice) * i.quantity,
      0
    );
    if (amountToman < 1000) throw new HttpError(400, "مبلغ سفارش خیلی کم است.");

    const amountRial = amountToman * 10;
    const MERCHANT = merchantId();

    const order = await prisma.order.create({
      data: {
        status: "pending",
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        customerAddress: body.customerAddress || null,
        note: body.note || null,
        itemsJson: JSON.stringify(body.items),
        amountToman,
        amountRial,
        gateway: "zarinpal",
      },
    });

    if (!MERCHANT) {
      // Unique authority per order (schema has @unique on authority)
      const demoAuth = `DEMO-${order.id}`;
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "paid", refId: `DEMO-${order.id.slice(-6)}`, authority: demoAuth },
      });
      const demoUrl = `${frontBase()}/checkout/result?orderId=${order.id}&Status=OK&RefID=DEMO-${order.id.slice(-6)}`;
      return res.json({
        orderId: order.id,
        paymentUrl: demoUrl,
        demo: true,
        amountToman,
      });
    }

    const callbackUrl = `${publicBase()}/api/orders/zarinpal/callback?orderId=${order.id}`;

    const zpRes = await fetch(zarinpalApi("request.json"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: MERCHANT,
        amount: amountRial,
        callback_url: callbackUrl,
        description: `سفارش پرده آنتیک #${order.id.slice(-6)}`,
        metadata: {
          mobile: body.customerPhone,
          email: body.customerEmail || undefined,
        },
      }),
    });

    const zp = (await zpRes.json()) as {
      data?: { authority?: string; code?: number };
      errors?: unknown;
    };

    const authority = zp?.data?.authority;
    if (!authority) {
      console.error("Zarinpal request failed", zp);
      await prisma.order.update({ where: { id: order.id }, data: { status: "failed" } });
      throw new HttpError(502, "خطا در اتصال به درگاه پرداخت. دوباره تلاش کنید.");
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { authority },
    });

    res.json({
      orderId: order.id,
      paymentUrl: startPayUrl(authority),
      authority,
      amountToman,
    });
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/zarinpal/callback", async (req, res) => {
  try {
    const orderId = String(req.query.orderId || "");
    const status = String(req.query.Status || req.query.status || "");
    const authority = String(req.query.Authority || req.query.authority || "");
    const FRONT = frontBase();
    const MERCHANT = merchantId();

    if (!orderId) {
      return res.redirect(`${FRONT}/checkout/result?Status=NOK`);
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.redirect(`${FRONT}/checkout/result?Status=NOK&orderId=${orderId}`);
    }

    if (status !== "OK") {
      await prisma.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
      return res.redirect(`${FRONT}/checkout/result?Status=NOK&orderId=${orderId}`);
    }

    if (order.status === "paid") {
      return res.redirect(
        `${FRONT}/checkout/result?Status=OK&orderId=${orderId}&RefID=${order.refId || ""}`
      );
    }

    if (!MERCHANT) {
      const demoAuth = authority || `DEMO-${orderId}`;
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "paid", refId: `DEMO-${orderId.slice(-6)}`, authority: demoAuth },
      });
      return res.redirect(
        `${FRONT}/checkout/result?Status=OK&orderId=${orderId}&RefID=DEMO-${orderId.slice(-6)}`
      );
    }

    const verifyRes = await fetch(zarinpalApi("verify.json"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: MERCHANT,
        amount: order.amountRial,
        authority: authority || order.authority,
      }),
    });

    const verify = (await verifyRes.json()) as {
      data?: { code?: number; ref_id?: number };
    };

    const code = verify?.data?.code;
    if (code === 100 || code === 101) {
      const refId = String(verify?.data?.ref_id ?? "");
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "paid", refId, authority: authority || order.authority },
      });
      return res.redirect(
        `${FRONT}/checkout/result?Status=OK&orderId=${orderId}&RefID=${refId}`
      );
    }

    await prisma.order.update({ where: { id: orderId }, data: { status: "failed" } });
    return res.redirect(`${FRONT}/checkout/result?Status=NOK&orderId=${orderId}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${frontBase()}/checkout/result?Status=NOK`);
  }
});

router.get("/", requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    res.json(
      rows.map((o) => ({
        id: o.id,
        status: o.status,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        amountToman: o.amountToman,
        refId: o.refId,
        items: JSON.parse(o.itemsJson),
        createdAt: o.createdAt,
      }))
    );
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, "سفارش پیدا نشد");
    let items: unknown[] = [];
    try {
      items = JSON.parse(order.itemsJson);
    } catch {
      items = [];
    }
    res.json({
      id: order.id,
      status: order.status,
      amountToman: order.amountToman,
      refId: order.refId,
      customerName: order.customerName,
      items,
      createdAt: order.createdAt,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.patch("/:id/status", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const status = String(req.body?.status || "");
    if (!["pending", "paid", "failed", "cancelled"].includes(status)) {
      throw new HttpError(400, "وضعیت نامعتبر");
    }
    const row = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ id: row.id, status: row.status });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
