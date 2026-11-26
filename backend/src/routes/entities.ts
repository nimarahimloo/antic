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
import { syncMediaUsage, extractImageUrls } from "../lib/mediaSync.js";

const router = Router();

// ---------- Collection relation helpers ----------

async function getEntityCollectionIds(entityName: string, entityId: string): Promise<string[]> {
  if (entityName === "Project") {
    const rels = await prisma.collectionProject.findMany({
      where: { projectId: entityId },
      select: { collectionId: true },
    });
    return rels.map((r) => r.collectionId);
  }
  if (entityName === "CurtainCategory") {
    const rels = await prisma.collectionCategory.findMany({
      where: { categoryId: entityId },
      select: { collectionId: true },
    });
    return rels.map((r) => r.collectionId);
  }
  return [];
}

async function validateCollectionsExist(tx: any, collectionIds: string[]): Promise<void> {
  if (!collectionIds.length) return;
  const existing = await tx.collection.findMany({
    where: { id: { in: collectionIds } },
    select: { id: true },
  });
  if (existing.length !== collectionIds.length) {
    throw new HttpError(400, "One or more collection IDs do not exist");
  }
}

async function writeCollectionRelations(
  tx: any,
  entityName: string,
  entityId: string,
  collectionIds: string[],
): Promise<void> {
  if (entityName === "Project") {
    await tx.collectionProject.deleteMany({ where: { projectId: entityId } });
    for (const collectionId of collectionIds) {
      await tx.collectionProject.create({
        data: { collectionId, projectId: entityId },
      });
    }
  } else if (entityName === "CurtainCategory") {
    await tx.collectionCategory.deleteMany({ where: { categoryId: entityId } });
    for (const collectionId of collectionIds) {
      await tx.collectionCategory.create({
        data: { collectionId, categoryId: entityId },
      });
    }
  }
}

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
    const rows = await meta.model.findMany({
      where,
      orderBy,
      take: limit,
      include: meta.name === "Project" || meta.name === "CurtainCategory"
        ? { collections: { select: { collectionId: true } } }
        : undefined,
    });
    const list = rows.map((row: any) => {
      const { collections: _cols, ...rest } = row;
      const collectionIds = _cols ? _cols.map((c: { collectionId: string }) => c.collectionId) : [];
      return { ...toApi(rest), collectionIds };
    });
    res.json(list);
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/:Entity/:id", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(routeParam(req, "Entity"));
    if (!canRead(meta, req.user)) throw new HttpError(403, "Forbidden");
    const include = meta.name === "Project" || meta.name === "CurtainCategory"
      ? { collections: { select: { collectionId: true } } }
      : undefined;
    // @ts-expect-error dynamic
    const row = await meta.model.findUnique({ where: { id: req.params.id }, include });
    if (!row) throw new HttpError(404, "Not found");
    const { collections: _cols, ...rest } = row as any;
    const collectionIds = _cols ? _cols.map((c: { collectionId: string }) => c.collectionId) : [];
    res.json({ ...toApi(rest), collectionIds });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/:Entity", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(routeParam(req, "Entity"));
    if (meta.name === "User") throw new HttpError(403, "Use /api/auth/register to create users");
    if (!canWrite(meta, req.user, true)) throw new HttpError(403, "Forbidden");
    const body = req.body || {};
    const collectionIds = Array.isArray(body.collectionIds) ? body.collectionIds : [];
    const data = fromApi(body, meta.name);
    if (Object.keys(data).length === 0) throw new HttpError(400, "Empty payload");

    // collectionIds is a relation field, not a scalar — strip before Prisma create
    const { collectionIds: _cid, ...createData } = data;

    let row: any;
    if (meta.name === "Project" || meta.name === "CurtainCategory") {
      // Atomic create: entity + collection relations in one transaction
      row = await prisma.$transaction(async (tx) => {
        let created: any;
        if (meta.name === "Project") {
          // @ts-expect-error dynamic input
          created = await tx.project.create({ data: createData });
        } else {
          // @ts-expect-error dynamic input
          created = await tx.curtainCategory.create({ data: createData });
        }

        if (collectionIds.length > 0) {
          await validateCollectionsExist(tx, collectionIds);
          await writeCollectionRelations(tx, meta.name, created.id, collectionIds);
        }

        return created;
      });
    } else {
      // @ts-expect-error dynamic
      row = await meta.model.create({ data: createData });
    }

    if (meta.name === "CurtainCategory") afterCategoryWrite(row);
    if (meta.name === "CurtainModel") afterModelWrite(row);

    // Sync MediaUsage for image/gallery fields (idempotent, non-blocking errors)
    try {
      const fields = extractImageUrls(meta.name, createData);
      if (Object.keys(fields).length > 0) {
        await syncMediaUsage(meta.name, row.id, fields);
      }
    } catch {
      /* sync failures must not fail entity creation */
    }

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

    const ids = meta.name === "Project" || meta.name === "CurtainCategory"
      ? await getEntityCollectionIds(meta.name, row.id)
      : [];
    res.status(201).json({ ...toApi(row), collectionIds: ids });
  } catch (err) {
    sendError(res, err);
  }
});

router.put("/:Entity/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(routeParam(req, "Entity"));
    if (meta.name === "User") throw new HttpError(403, "User updates via entities are disabled");
    const body = req.body || {};
    const hasCollectionIds = "collectionIds" in body;
    const collectionIds = hasCollectionIds && Array.isArray(body.collectionIds) ? body.collectionIds : null;
    const data = fromApi(body, meta.name);
    if (Object.keys(data).length === 0) throw new HttpError(400, "Empty payload");

    // collectionIds is a relation field, not a scalar — strip before Prisma update
    const { collectionIds: _cid, ...updateData } = data;

    let row: any;
    if (meta.name === "Project" || meta.name === "CurtainCategory") {
      // Atomic update: entity + collection relations in one transaction
      row = await prisma.$transaction(async (tx) => {
        let updated: any;
        const entityId = req.params.id as string;
        if (meta.name === "Project") {
          updated = await tx.project.update({ where: { id: entityId }, data: updateData });
        } else {
          updated = await tx.curtainCategory.update({ where: { id: entityId }, data: updateData });
        }

        // Only touch collection relations when the caller explicitly sent collectionIds
        if (hasCollectionIds) {
          if (collectionIds!.length > 0) {
            await validateCollectionsExist(tx, collectionIds!);
          }
          await writeCollectionRelations(tx, meta.name, updated.id, collectionIds!);
        }
        // If collectionIds was not in the body, preserve existing assignments (no-op)

        return updated;
      });
    } else {
      // @ts-expect-error dynamic
      row = await meta.model.update({ where: { id: req.params.id }, data: updateData });
    }

    if (meta.name === "CurtainCategory") afterCategoryWrite(row);
    if (meta.name === "CurtainModel") {
      if (data.image !== undefined || data.categorySlug !== undefined || data.subcategory !== undefined) {
        afterModelWrite(row);
      }
    }

    // Sync MediaUsage for image/gallery fields (idempotent, non-blocking errors)
    try {
      const fields = extractImageUrls(meta.name, updateData);
      if (Object.keys(fields).length > 0) {
        await syncMediaUsage(meta.name, row.id, fields);
      }
    } catch {
      /* sync failures must not fail entity updates */
    }

    const ids = meta.name === "Project" || meta.name === "CurtainCategory"
      ? await getEntityCollectionIds(meta.name, row.id)
      : [];
    res.json({ ...toApi(row), collectionIds: ids });
  } catch (err) {
    sendError(res, err);
  }
});

router.delete("/:Entity/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const meta = getMeta(routeParam(req, "Entity"));
    if (meta.name === "User") throw new HttpError(403, "Cannot delete users via entities");

    // Clean up MediaUsage rows referencing this entity before deletion.
    try {
      await prisma.mediaUsage.deleteMany({
        where: { entityType: meta.name, entityId: req.params.id as string },
      });
    } catch {
      /* sync cleanup failures must not fail entity deletion */
    }

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

// ============================================
// Collection relationships management (admin)
// ============================================

// Collection <-> Products
router.get("/admin/Collection/:id/products", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const relations = await prisma.collectionProduct.findMany({
      where: { collectionId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products: relations.map((r) => r.product) });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/admin/Collection/:id/products", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const { productId } = req.body;
    if (!productId) throw new HttpError(400, "productId is required");

    await prisma.collectionProduct.create({
      data: { collectionId, productId },
    });

    const relations = await prisma.collectionProduct.findMany({
      where: { collectionId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products: relations.map((r) => r.product) });
  } catch (err) {
    sendError(res, err);
  }
});

router.delete("/admin/Collection/:id/products/:productId", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const productId = routeParam(req, "productId");
    await prisma.collectionProduct.delete({ where: { collectionId_productId: { collectionId, productId } } });
    const relations = await prisma.collectionProduct.findMany({
      where: { collectionId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products: relations.map((r) => r.product) });
  } catch (err) {
    sendError(res, err);
  }
});

// Collection <-> CurtainCategories
router.get("/admin/Collection/:id/categories", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const relations = await prisma.collectionCategory.findMany({
      where: { collectionId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ categories: relations.map((r) => r.category) });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/admin/Collection/:id/categories", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const { categoryId } = req.body;
    if (!categoryId) throw new HttpError(400, "categoryId is required");

    await prisma.collectionCategory.create({
      data: { collectionId, categoryId },
    });

    const relations = await prisma.collectionCategory.findMany({
      where: { collectionId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ categories: relations.map((r) => r.category) });
  } catch (err) {
    sendError(res, err);
  }
});

router.delete("/admin/Collection/:id/categories/:categoryId", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const categoryId = routeParam(req, "categoryId");
    await prisma.collectionCategory.delete({ where: { collectionId_categoryId: { collectionId, categoryId } } });
    const relations = await prisma.collectionCategory.findMany({
      where: { collectionId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ categories: relations.map((r) => r.category) });
  } catch (err) {
    sendError(res, err);
  }
});

// Collection <-> Projects
router.get("/admin/Collection/:id/projects", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const relations = await prisma.collectionProject.findMany({
      where: { collectionId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ projects: relations.map((r) => r.project) });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/admin/Collection/:id/projects", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const { projectId } = req.body;
    if (!projectId) throw new HttpError(400, "projectId is required");

    await prisma.collectionProject.create({
      data: { collectionId, projectId },
    });

    const relations = await prisma.collectionProject.findMany({
      where: { collectionId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ projects: relations.map((r) => r.project) });
  } catch (err) {
    sendError(res, err);
  }
});

router.delete("/admin/Collection/:id/projects/:projectId", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const collectionId = routeParam(req, "id");
    const projectId = routeParam(req, "projectId");
    await prisma.collectionProject.delete({ where: { collectionId_projectId: { collectionId, projectId } } });
    const relations = await prisma.collectionProject.findMany({
      where: { collectionId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ projects: relations.map((r) => r.project) });
  } catch (err) {
    sendError(res, err);
  }
});

// Public: Get products for a collection
router.get("/Collection/:slug/products", async (req, res) => {
  try {
    const slug = req.params.slug;
    const collection = await prisma.collection.findUnique({
      where: { slug, active: true },
      include: {
        products: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!collection) throw new HttpError(404, "Collection not found");
    res.json({ products: collection.products.map((r) => r.product) });
  } catch (err) {
    sendError(res, err);
  }
});

// Public: Get categories for a collection
router.get("/Collection/:slug/categories", async (req, res) => {
  try {
    const slug = req.params.slug;
    const collection = await prisma.collection.findUnique({
      where: { slug, active: true },
      include: {
        categories: {
          include: { category: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!collection) throw new HttpError(404, "Collection not found");
    res.json({ categories: collection.categories.map((r) => r.category) });
  } catch (err) {
    sendError(res, err);
  }
});

// Public: Get projects for a collection (with category filter)
router.get("/Collection/:slug/projects", async (req, res) => {
  try {
    const slug = req.params.slug;
    const categorySlug = req.query.categorySlug as string | undefined;
    const collection = await prisma.collection.findUnique({
      where: { slug, active: true },
      include: {
        projects: {
          include: { project: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!collection) throw new HttpError(404, "Collection not found");

    let projects = collection.projects.map((r) => r.project);
    if (categorySlug) {
      projects = projects.filter((p) => p.categorySlug === categorySlug);
    }
    res.json({ projects });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
