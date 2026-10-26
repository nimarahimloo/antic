import { Router } from "express";
import {
  ENTITY_MAP,
  isEntityName,
  parseFilter,
  parseSort,
  type EntityName,
} from "../lib/entities.js";
import { fromApi, toApi, toApiList } from "../lib/serialize.js";
import { HttpError, sendError } from "../lib/errors.js";
import { optionalAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { ensureCategoryTemplateBackground } from "../services/categoryTemplate.js";
import { renderOneModel } from "../services/renderQueue.js";

const router = Router();

function getMeta(name: string) {
  if (!isEntityName(name)) throw new HttpError(404, `Unknown entity: ${name}`);
  return { name: name as EntityName, ...ENTITY_MAP[name as EntityName] };
}

function canRead(meta: ReturnType<typeof getMeta>, user?: { role: string }) {
  if (meta.publicRead) return true;
  return user?.role === "admin";
}

function canWrite(meta: ReturnType<typeof getMeta>, user?: { role: string }, isCreate = false) {
  if (isCreate && meta.publicCreate) return true;
  return user?.role === "admin";
}

function searchWhere(entity: string, search: string): Record<string, unknown> | null {
  const q = search.trim();
  if (!q || entity !== "CurtainModel") return null;
  return {
    OR: [
      { code: { contains: q } },
      { name: { contains: q } },
      { fabric: { contains: q } },
      { color: { contains: q } },
      { material: { contains: q } },
      { texture: { contains: q } },
      { description: { contains: q } },
      { categorySlug: { contains: q } },
      { subcategory: { contains: q } },
    ],
  };
}

/** After category write → ensure chroma only if missing (never clobber admin upload) */
function afterCategoryWrite(row: { slug?: string | null }) {
  if (row?.slug) ensureCategoryTemplateBackground(row.slug, false);
}

/** After model write with fabric image → queue install render (async) */
function afterModelWrite(row: {
  id: string;
  image?: string | null;
  installImage?: string | null;
}) {
  if (!row?.id || !row.image) return;
  renderOneModel(row.id, { regenerate: true }).catch((e) =>
    console.warn("[auto-render]", row.id, e instanceof Error ? e.message : e)
  );
}

router.get("/:Entity/count", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(req.params.Entity);
    if (!canRead(meta, req.user)) throw new HttpError(403, "Forbidden");
    let filter: Record<string, unknown> = {};
    if (typeof req.query.filter === "string") {
      try {
        filter = JSON.parse(req.query.filter);
      } catch {
        /* */
      }
    }
    for (const [k, v] of Object.entries(req.query)) {
      if (["filter", "search"].includes(k)) continue;
      if (typeof v === "string") filter[k] = v;
    }
    let where: Record<string, unknown> = parseFilter(filter);
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const sw = searchWhere(meta.name, search);
    if (sw) where = Object.keys(where).length ? { AND: [where, sw] } : sw;
    // @ts-expect-error dynamic
    const n = await meta.model.count({ where });
    res.json({ count: n });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/:Entity", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(req.params.Entity);
    if (!canRead(meta, req.user)) throw new HttpError(403, "Forbidden");

    const sortBy = (req.query.sort_by as string) || (req.query.sort as string);
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    let filter: Record<string, unknown> = {};
    if (typeof req.query.filter === "string") {
      try {
        filter = JSON.parse(req.query.filter);
      } catch {
        /* */
      }
    }
    for (const [k, v] of Object.entries(req.query)) {
      if (["sort_by", "sort", "limit", "skip", "filter", "q", "search"].includes(k)) continue;
      if (typeof v === "string") filter[k] = v;
    }

    let where: Record<string, unknown> = parseFilter(filter);
    const search =
      (typeof req.query.search === "string" && req.query.search) ||
      (typeof req.query.q === "string" && !String(req.query.q).startsWith("{") ? req.query.q : "") ||
      "";
    const sw = searchWhere(meta.name, search);
    if (sw) where = Object.keys(where).length ? { AND: [where, sw] } : sw;

    const orderBy = parseSort(sortBy);
    // @ts-expect-error dynamic
    const rows = await meta.model.findMany({ where, orderBy, take: limit });
    res.json(toApiList(rows));
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/:Entity/:id", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(req.params.Entity);
    if (!canRead(meta, req.user)) throw new HttpError(403, "Forbidden");
    // @ts-expect-error dynamic
    const row = await meta.model.findUnique({ where: { id: req.params.id } });
    if (!row) throw new HttpError(404, "Not found");
    res.json(toApi(row));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/:Entity", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(req.params.Entity);
    if (meta.name === "User") throw new HttpError(403, "Use /api/auth/register to create users");
    if (!canWrite(meta, req.user, true)) throw new HttpError(403, "Forbidden");
    const data = fromApi(req.body || {}, meta.name);
    if (Object.keys(data).length === 0) throw new HttpError(400, "Empty payload");
    // @ts-expect-error dynamic
    const row = await meta.model.create({ data });

    if (meta.name === "CurtainCategory") afterCategoryWrite(row);
    if (meta.name === "CurtainModel") afterModelWrite(row);

    res.status(201).json(toApi(row));
  } catch (err) {
    sendError(res, err);
  }
});

router.put("/:Entity/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(req.params.Entity);
    if (meta.name === "User") throw new HttpError(403, "User updates via entities are disabled");
    const data = fromApi(req.body || {}, meta.name);
    if (Object.keys(data).length === 0) throw new HttpError(400, "Empty payload");
    // @ts-expect-error dynamic
    const row = await meta.model.update({ where: { id: req.params.id }, data });

    if (meta.name === "CurtainCategory") afterCategoryWrite(row);
    if (meta.name === "CurtainModel") {
      if (data.image !== undefined || data.categorySlug !== undefined || data.subcategory !== undefined) {
        afterModelWrite(row);
      }
    }

    res.json(toApi(row));
  } catch (err) {
    sendError(res, err);
  }
});

router.delete("/:Entity/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(req.params.Entity);
    if (meta.name === "User") throw new HttpError(403, "Cannot delete users via entities");
    // @ts-expect-error dynamic
    await meta.model.delete({ where: { id: req.params.id } });
    res.json({ id: req.params.id });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
