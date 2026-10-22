import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword, signToken } from "../lib/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { toApi } from "../lib/serialize.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
});

router.post("/register", async (req, res) => {
  try {
    const body = credsSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "Email already registered");

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password),
        fullName: body.full_name || null,
        role: "user",
      },
    });
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.status(201).json({ user: toApi(user), token });
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.json({ user: toApi(user), token });
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

export default router;
