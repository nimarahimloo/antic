import { Router } from "express";
import { z } from "zod";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { getQueueState, renderOneModel, runBatch, listCategoryTemplateCoverage } from "../services/renderQueue.js";
import { prisma } from "../lib/prisma.js";
import { ALL_STYLE_KEYS, STYLE_META, resolveStyle, guessMaterial, type CurtainStyleKey } from "../lib/curtainStyles.js";
import { generateChromaTemplate } from "../services/templateGenerator.js";
import path from "path";

const router = Router();

/** Public: cached only — no generation */
router.get("/install/:modelId", async (req, res) => {
  try {
    const model = await prisma.curtainModel.findUnique({ where: { id: req.params.modelId } });
    if (!model) throw new HttpError(404, "Model not found");
    const style = resolveStyle(model);
    res.json({
      install_image: model.installImage || null,
      status: model.installStatus || null,
      fabric_image: model.image || null,
      style,
      category_slug: model.categorySlug,
      style_label: STYLE_META[style]?.label,
      material: guessMaterial(model),
      generated: Boolean(model.installImage),
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** Public: taxonomy for admin UI / docs */
router.get("/styles", (_req, res) => {
  res.json({
    styles: ALL_STYLE_KEYS.map((k) => ({
      key: k,
      ...STYLE_META[k],
    })),
  });
});

router.post("/batch", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        regenerate: z.boolean().optional(),
        limit: z.number().int().positive().max(2000).optional(),
      })
      .parse(req.body || {});

    const result = await runBatch(body);
    res.json({ ok: true, ...result, state: getQueueState() });
  } catch (err) {
    if (err instanceof Error && /در حال اجرا/.test(err.message)) {
      return sendError(res, new HttpError(409, err.message));
    }
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/batch/status", requireAdmin, async (_req, res) => {
  res.json(getQueueState());
});

router.post("/one", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        model_id: z.string(),
        regenerate: z.boolean().optional(),
      })
      .parse(req.body || {});
    const result = await renderOneModel(body.model_id, { regenerate: body.regenerate });
    res.json(result);
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const models = await prisma.curtainModel.findMany({
      select: {
        image: true,
        installImage: true,
        installStatus: true,
        categorySlug: true,
        subcategory: true,
      },
    });
    let withInstall = 0,
      approved = 0,
      rejected = 0,
      fabric = 0;
    const byStyle: Record<string, { total: number; withInstall: number }> = {};
    for (const m of models) {
      if (m.image) fabric++;
      if (m.installImage) withInstall++;
      if (m.installStatus === "approved") approved++;
      if (m.installStatus === "rejected") rejected++;
      const st = resolveStyle(m);
      if (!byStyle[st]) byStyle[st] = { total: 0, withInstall: 0 };
      byStyle[st].total++;
      if (m.installImage) byStyle[st].withInstall++;
    }
    const templateRows = await prisma.renderTemplate.findMany({
      select: { style: true },
    });
    const templateStyles = new Set(templateRows.map((t) => t.style));
    const missingTemplates = ALL_STYLE_KEYS.filter((k) => !templateStyles.has(k));

    res.json({
      total: models.length,
      withFabric: fabric,
      withInstall,
      approved,
      rejected,
      pendingReview: withInstall - approved - rejected,
      missingInstall: fabric - withInstall,
      templates: templateRows.length,
      missingTemplates,
      byStyle,
      queue: getQueueState(),
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** Categories from DB + which have chroma / real install reference */
router.get("/categories-coverage", requireAdmin, async (_req, res) => {
  try {
    const coverage = await listCategoryTemplateCoverage();
    res.json({ categories: coverage });
  } catch (err) {
    sendError(res, err);
  }
});

/**
 * Generate procedural chroma template for a DB category slug.
 * Geometry from mechanism; stored under category.slug so models find it first.
 */
router.post("/template/from-category", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        category_slug: z.string().min(1),
        mechanism: z.string().optional(),
      })
      .parse(req.body || {});

    const cat = await prisma.curtainCategory.findFirst({
      where: { slug: body.category_slug },
    });
    if (!cat) throw new HttpError(404, `دسته «${body.category_slug}» در دیتابیس نیست`);

    const mechanism = (body.mechanism ||
      resolveStyle({ categorySlug: cat.slug, subcategory: null })) as CurtainStyleKey;

    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const gen = await generateChromaTemplate(mechanism, path.resolve(uploadDir));

    const existing = await prisma.renderTemplate.findFirst({
      where: { style: cat.slug },
      orderBy: { updatedAt: "desc" },
    });
    let row;
    if (existing) {
      row = await prisma.renderTemplate.update({
        where: { id: existing.id },
        data: { image: gen.publicPath },
      });
    } else {
      row = await prisma.renderTemplate.create({
        data: { style: cat.slug, image: gen.publicPath },
      });
    }

    const mechExisting = await prisma.renderTemplate.findFirst({
      where: { style: mechanism },
      orderBy: { updatedAt: "desc" },
    });
    if (mechExisting) {
      await prisma.renderTemplate.update({
        where: { id: mechExisting.id },
        data: { image: gen.publicPath },
      });
    } else {
      await prisma.renderTemplate.create({
        data: { style: mechanism, image: gen.publicPath },
      });
    }

    res.json({
      ok: true,
      category: { id: cat.id, name: cat.name, slug: cat.slug },
      mechanism,
      template: row,
      publicPath: gen.publicPath,
    });
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

/** Generate templates for ALL categories in DB */
router.post("/template/all-categories", requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const categories = await prisma.curtainCategory.findMany({ orderBy: { order: "asc" } });
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const results: unknown[] = [];
    for (const cat of categories) {
      const mechanism = resolveStyle({ categorySlug: cat.slug, subcategory: null }) as CurtainStyleKey;
      const gen = await generateChromaTemplate(mechanism, path.resolve(uploadDir));
      const existing = await prisma.renderTemplate.findFirst({
        where: { style: cat.slug },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) {
        await prisma.renderTemplate.update({
          where: { id: existing.id },
          data: { image: gen.publicPath },
        });
      } else {
        await prisma.renderTemplate.create({
          data: { style: cat.slug, image: gen.publicPath },
        });
      }
      results.push({ slug: cat.slug, name: cat.name, mechanism, path: gen.publicPath });
    }
    res.json({ ok: true, count: results.length, results });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
