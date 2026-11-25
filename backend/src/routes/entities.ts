import { sendMail } from "../lib/mailer.js";
import {
  consultationConfirmationEmail,
  consultationAdminEmail,
} from "../lib/emailTemplates.js";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  ENTITY_MAP,
  isEntityName,
  parseFilter,
  parseSort,
  type EntityName,
} from "../lib/entities.js";
import { fromApi, toApi, toApiList } from "../lib/serialize.js";
import { HttpError, sendError } from "../lib/errors.js";
import { routeParam } from "../lib/routeParams.js";
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
    const meta = getMeta(routeParam(req, "Entity"));
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
    const meta = getMeta(routeParam(req, "Entity"));
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
    const meta = getMeta(routeParam(req, "Entity"));
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
    const meta = getMeta(routeParam(req, "Entity"));
    if (meta.name === "User") throw new HttpError(403, "Use /api/auth/register to create users");
    if (!canWrite(meta, req.user, true)) throw new HttpError(403, "Forbidden");
    const data = fromApi(req.body || {}, meta.name);
    if (Object.keys(data).length === 0) throw new HttpError(400, "Empty payload");
    // @ts-expect-error dynamic
    const row = await meta.model.create({ data });

    if (meta.name === "CurtainCategory") afterCategoryWrite(row);
    if (meta.name === "CurtainModel") afterModelWrite(row);

    // Send consultation request emails (non-blocking)
    if (meta.name === "ConsultationRequest") {
      const cr = row as {
        id: string; fullName: string; phone: string; email: string | null;
        city: string | null; spaceType: string | null; message: string | null;
      };
      if (cr.email) {
        const { text, html } = consultationConfirmationEmail(cr.email, cr.fullName, cr.id);
        sendMail({
          to: cr.email,
          subject: "دریافت درخواست مشاوره — پرده آنتیک",
          text,
          html,
        }).catch(() => {});
      }
      // Admin notification
      const adminEmail = process.env.ADMIN_EMAIL || "admin@antic.local";
      const { text: adminText, html: adminHtml } = consultationAdminEmail(
        adminEmail,
        cr.fullName,
        cr.phone,
        cr.email,
        cr.city,
        cr.spaceType,
        cr.message,
        cr.id,
      );
      sendMail({
        to: adminEmail,
        subject: "درخواست مشاوره جدید — پرده آنتیک",
        text: adminText,
        html: adminHtml,
      }).catch(() => {});
    }

    res.status(201).json(toApi(row));
  } catch (err) {
    sendError(res, err);
  }
});

router.put("/:Entity/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(routeParam(req, "Entity"));
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
    const meta = getMeta(routeParam(req, "Entity"));
    if (meta.name === "User") throw new HttpError(403, "Cannot delete users via entities");
    // @ts-expect-error dynamic
    await meta.model.delete({ where: { id: req.params.id } });
    res.json({ id: req.params.id });
  } catch (err) {
    sendError(res, err);
  }
});

// CurtainModel related projects endpoints
router.get("/CurtainModel/:id/related-projects", async (req, res) => {
  try {
    const modelId = req.params.id;
    const limit = Math.min(Number(req.query.limit) || 6, 20);

    const model = await prisma.curtainModel.findUnique({
      where: { id: modelId },
      include: {
        relatedProjects: {
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            coverImage: true,
            categorySlug: true,
            subcategory: true,
          },
        },
      },
    });

    if (!model) {
      return res.status(404).json({ error: "Curtain model not found" });
    }

    const projects = model.relatedProjects.map((p: { id: string; title: string; coverImage: string | null; categorySlug: string | null; subcategory: string | null }) => ({
      id: p.id,
      title: p.title,
      cover_image: p.coverImage,
      category_slug: p.categorySlug,
      subcategory: p.subcategory,
    }));

    res.json({ projects });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/admin/CurtainModel/:id/related-projects", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const modelId = req.params.id;
    // Use raw query for implicit relation table
    const relations = await prisma.$queryRaw<Array<{ B: string }>>`
      SELECT "B" FROM "_CurtainModelRelatedProjects" WHERE "A" = ${modelId} LIMIT 50
    `;
    const projectIds = relations.map((r) => r.B);
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, coverImage: true, categorySlug: true, subcategory: true },
    });
    res.json({ projects });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/admin/CurtainModel/:id/related-projects", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const modelId = req.params.id;
    const { projectId } = req.body;
    if (!projectId) throw new HttpError(400, "projectId is required");

    // Use raw query for implicit relation table
    await prisma.$executeRaw`
      INSERT INTO "_CurtainModelRelatedProjects" ("A", "B") VALUES (${modelId}, ${projectId})
      ON CONFLICT DO NOTHING
    `;
    const projects = await prisma.project.findMany({
      where: { id: { in: [projectId] } },
      select: { id: true, title: true, coverImage: true, categorySlug: true, subcategory: true },
    });
    res.json({ projects });
  } catch (err) {
    sendError(res, err);
  }
});

router.delete("/admin/CurtainModel/:id/related-projects/:projectId", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const modelId = req.params.id;
    const projectId = req.params.projectId;

    await prisma.$executeRaw`
      DELETE FROM "_CurtainModelRelatedProjects" WHERE "A" = ${modelId} AND "B" = ${projectId}
    `;
    const relations = await prisma.$queryRaw<Array<{ B: string }>>`
      SELECT "B" FROM "_CurtainModelRelatedProjects" WHERE "A" = ${modelId}
    `;
    const projectIds = relations.map((r) => r.B);
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, coverImage: true, categorySlug: true, subcategory: true },
    });
    res.json({ projects });
  } catch (err) {
    sendError(res, err);
  }
});

// Get projects for a category (used in catalog page)
router.get("/CurtainCategory/:slug/projects", async (req, res) => {
  try {
    const slug = req.params.slug;
    const subcategory = req.query.subcategory as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const where: Record<string, unknown> = { categorySlug: slug };
    if (subcategory) where.subcategory = subcategory;

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        coverImage: true,
        categorySlug: true,
        subcategory: true,
      },
    });

    res.json({ projects });
  } catch (err) {
    sendError(res, err);
  }
});

// Get related projects for a CurtainModel (using the implicit relation table)
router.get("/CurtainModel/:id/related-projects", async (req, res) => {
  try {
    const modelId = req.params.id;
    const limit = Math.min(Number(req.query.limit) || 6, 20);

    const relations = await prisma.$queryRaw<Array<{ B: string }>>`
      SELECT "B" FROM "_CurtainModelRelatedProjects" WHERE "A" = ${modelId} LIMIT ${limit}
    `;
    const projectIds = relations.map((r) => r.B);
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, title: true, coverImage: true, categorySlug: true, subcategory: true },
    });

    res.json({ projects });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
