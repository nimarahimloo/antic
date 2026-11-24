import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { HttpError, sendError } from "../lib/errors.js";
import {
  getCurtainModel,
  listCurtainCategories,
  listCurtainProjects,
  searchCurtainModels,
} from "../services/aiCatalog.js";

/**
 * Internal read-only catalog tool bridge consumed by the edge MCP Worker.
 * The Worker implements the public Streamable HTTP MCP transport.
 * Tools: list_categories, search_models, list_projects, get_model.
 */
const router = Router();

const toolSchemas = {
  list_categories: z.object({}).strict(),
  search_models: z.object({
    query: z.string().max(160).optional(),
    category_slug: z.string().max(100).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }).strict(),
  get_model: z.object({
    id: z.string().trim().min(1).max(128),
  }).strict(),
  list_projects: z.object({
    limit: z.number().int().min(1).max(50).optional(),
  }).strict(),
};

function requireMcpWorker(req: import("express").Request) {
  const expected = process.env.MCP_WORKER_TOKEN?.trim();
  if (!expected) {
    throw new HttpError(503, "MCP Worker authentication is not configured.");
  }

  const supplied = req.get("x-mcp-worker-token") || "";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    throw new HttpError(401, "Invalid MCP Worker credential.");
  }
}

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
    requireMcpWorker(req);
    const name = req.params.name;
    const schema = toolSchemas[name as keyof typeof toolSchemas];
    if (!schema) {
      return res.status(404).json({ error: "Unknown tool" });
    }
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid tool arguments",
        details: parsed.error.flatten(),
      });
    }
    const args = parsed.data as Record<string, unknown>;

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

    res.status(404).json({ error: "Unknown tool" });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
