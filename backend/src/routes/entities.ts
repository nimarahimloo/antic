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
      if (["filter"].includes(k)) continue;
      if (typeof v === "string") filter[k] = v;
    }
    // @ts-expect-error dynamic
    const n = await meta.model.count({ where: parseFilter(filter) });
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
    } else if (typeof req.query.q === "string") {
      try {
        filter = JSON.parse(req.query.q);
      } catch {
        /* */
      }
    }
    for (const [k, v] of Object.entries(req.query)) {
      if (["sort_by", "sort", "limit", "skip", "filter", "q"].includes(k)) continue;
      if (typeof v === "string") filter[k] = v;
    }

    const where = parseFilter(filter);
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
