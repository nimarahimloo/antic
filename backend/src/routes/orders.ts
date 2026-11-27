import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError, sendError } from "../lib/errors.js";
import { routeParam } from "../lib/routeParams.js";
import { requireAdmin, optionalAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const orderIdParam = z.object({
  id: z.string().min(1),
});

const statusBody = z.object({
  status: z.enum(["pending", "paid", "failed", "cancelled"]),
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
        items: JSON.parse(o.itemsJson ?? "[]"),
        createdAt: o.createdAt,
      }))
    );
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/:id", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const { id } = orderIdParam.parse(req.params);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new HttpError(404, "سفارش پیدا نشد");

    // If authenticated, verify ownership; unauthenticated access allowed
    // for order lookup (order IDs are unguessable cuid).
    if (req.user) {
      const owns =
        order.userId === req.user.sub ||
        (req.user.email && order.customerEmail === req.user.email);
      if (!owns) throw new HttpError(403, "دسترسی به این سفارش ندارید");
    }

    let items: unknown[] = [];
    try {
      items = JSON.parse(order.itemsJson ?? "[]");
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
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.patch("/:id/status", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const { id } = orderIdParam.parse(req.params);
    const { status } = statusBody.parse(req.body);
    const row = await prisma.order.update({
      where: { id },
      data: { status },
    });
    res.json({ id: row.id, status: row.status });
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

export default router;
