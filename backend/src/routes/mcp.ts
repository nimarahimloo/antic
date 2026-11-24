import { Router } from "express";
import { sendError } from "../lib/errors.js";
import {
  getCurtainModel,
  listCurtainCategories,
  listCurtainProjects,
  searchCurtainModels,
} from "../services/aiCatalog.js";

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
      return res.json(await listCurtainCategories());
    }

    if (name === "search_models") {
      return res.json(
        await searchCurtainModels({
          query: String(args.query || ""),
          category_slug: String(args.category_slug || ""),
          limit: Number(args.limit) || 20,
        }),
      );
    }

    if (name === "get_model") {
      const result = await getCurtainModel({ id: String(args.id || "") });
      const found = result.content as { found?: boolean; message?: string };
      if (found?.found === false) {
        return res.status(404).json(result);
      }
      return res.json(result);
    }

    if (name === "list_projects") {
      return res.json(
        await listCurtainProjects({ limit: Number(args.limit) || 20 }),
      );
    }

    res.status(404).json({ error: `Unknown tool: ${name}` });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
