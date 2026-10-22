import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/errors.js";

/**
 * Minimal MCP-over-HTTP surface for catalog (read-only).
 * Not a full MCP transport — enough for Connect page demos and simple clients.
 * Tools: list_categories, search_models, list_projects, get_model
 */
const router = Router();

router.get("/", (_req, res) => {
  res.json({
    name: "antic-catalog",
    version: "1.0.0",
    description: "پرده آنتیک — کاتالوگ فقط‌خواندنی",
    tools: [
      {
        name: "list_categories",
        description: "لیست دسته‌بندی‌های پرده",
      },
      {
        name: "search_models",
        description: "جست‌وجوی مدل‌های پرده با متن یا دسته",
        parameters: { query: "string?", category_slug: "string?", limit: "number?" },
      },
      {
        name: "get_model",
        description: "جزئیات یک مدل با id",
        parameters: { id: "string" },
      },
      {
        name: "list_projects",
        description: "لیست پروژه‌های اجرا شده",
        parameters: { limit: "number?" },
      },
    ],
  });
});

router.post("/tools/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const args = (req.body || {}) as Record<string, unknown>;

    if (name === "list_categories") {
      const rows = await prisma.curtainCategory.findMany({ orderBy: { order: "asc" } });
      return res.json({
        content: rows.map((c) => ({
          name: c.name,
          slug: c.slug,
          description: c.description,
        })),
      });
    }

    if (name === "search_models") {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const q = String(args.query || "").trim();
      const category = String(args.category_slug || "").trim();
      const where: Record<string, unknown> = {};
      if (category) where.categorySlug = category;
      const rows = await prisma.curtainModel.findMany({
        where,
        take: 100,
        orderBy: { updatedAt: "desc" },
      });
      const filtered = q
        ? rows.filter((m) =>
            `${m.name} ${m.code} ${m.fabric || ""} ${m.color || ""} ${m.description || ""}`
              .toLowerCase()
              .includes(q.toLowerCase())
          )
        : rows;
      return res.json({
        content: filtered.slice(0, limit).map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          category_slug: m.categorySlug,
          color: m.color,
          fabric: m.fabric,
          url: `/curtain/${m.id}`,
        })),
      });
    }

    if (name === "get_model") {
      const id = String(args.id || "");
      const m = await prisma.curtainModel.findUnique({ where: { id } });
      if (!m) return res.status(404).json({ error: "not found" });
      return res.json({
        content: {
          id: m.id,
          code: m.code,
          name: m.name,
          category_slug: m.categorySlug,
          color: m.color,
          fabric: m.fabric,
          description: m.description,
          image: m.image,
          install_image: m.installImage,
          url: `/curtain/${m.id}`,
        },
      });
    }

    if (name === "list_projects") {
      const limit = Math.min(Number(args.limit) || 20, 50);
      const rows = await prisma.project.findMany({
        take: limit,
        orderBy: { updatedAt: "desc" },
      });
      return res.json({
        content: rows.map((p) => ({
          id: p.id,
          title: p.title,
          space_type: p.spaceType,
          location: p.location,
          featured: p.featured,
          cover_image: p.coverImage,
        })),
      });
    }

    res.status(404).json({ error: `Unknown tool: ${name}` });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
