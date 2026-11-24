import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { HttpError, sendError } from "../lib/errors.js";
import { catalogToolSchemas, executeCatalogTool } from "../services/catalogToolRegistry.js";

/**
 * Internal read-only catalog tool bridge consumed by the edge MCP Worker.
 * The Worker implements the public Streamable HTTP MCP transport.
 * Tools: list_categories, search_models, list_projects, get_model.
 */
const router = Router();

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
    const schema = catalogToolSchemas[name as keyof typeof catalogToolSchemas];
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

    const result = await executeCatalogTool(
      name as keyof typeof catalogToolSchemas,
      args,
    );
    if (name === "get_model" && result && typeof result === "object" && "content" in result) {
      const content = (result as { content?: unknown }).content;
      if (content && typeof content === "object" && "found" in content && content.found === false) {
        return res.status(404).json(result);
      }
    }
    return res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
