import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";

const router = Router();

/**
 * Problem tracking table schema (created on first use):
 * CREATE TABLE IF NOT EXISTS diagnostic_problems (
 *   id TEXT PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   description TEXT,
 *   status TEXT NOT NULL DEFAULT 'open', -- open, worked, didnt-work, fixed, production-ready
 *   severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
 *   category TEXT NOT NULL DEFAULT 'general', -- frontend, backend, database, e2e, deployment, other
 *   frontend_url TEXT,
 *   backend_url TEXT,
 *   error_message TEXT,
 *   steps_to_reproduce TEXT,
 *   fix_notes TEXT,
 *   tested_by TEXT,
 *   tested_at TEXT,
 *   created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TEXT DEFAULT CURRENT_TIMESTAMP
 * );
 */

// Ensure the problems table exists (SQLite)
async function ensureProblemsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diagnostic_problems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      severity TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT 'general',
      frontend_url TEXT,
      backend_url TEXT,
      error_message TEXT,
      steps_to_reproduce TEXT,
      fix_notes TEXT,
      tested_by TEXT,
      tested_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/** GET /api/diagnostic/problems — list all problems (admin only) */
router.get("/problems", requireAdmin, async (req: AuthedRequest, res) => {
  await ensureProblemsTable();
  const { status, severity, category, limit = "100", offset = "0" } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (category) where.category = category;

  const problems = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * FROM diagnostic_problems
    ${Object.keys(where).length ? `WHERE ${Object.entries(where).map(([k]) => `${k} = ?`).join(" AND ")}` : ""}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, ...Object.values(where), parseInt(limit), parseInt(offset));

  const countRow = await prisma.$queryRawUnsafe<{ count: number }[]>(`
    SELECT COUNT(*) as count FROM diagnostic_problems
    ${Object.keys(where).length ? `WHERE ${Object.entries(where).map(([k]) => `${k} = ?`).join(" AND ")}` : ""}
  `, ...Object.values(where));

  res.json({
    problems,
    total: countRow[0]?.count || 0,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

/** POST /api/diagnostic/problems — create a new problem (admin only) */
router.post("/problems", requireAdmin, async (req: AuthedRequest, res) => {
  await ensureProblemsTable();
  const {
    title,
    description,
    status = "open",
    severity = "medium",
    category = "general",
    frontend_url,
    backend_url,
    error_message,
    steps_to_reproduce,
    fix_notes,
    tested_by,
  } = req.body as Record<string, unknown>;

  if (!title) {
    throw new HttpError(400, "VALIDATION_ERROR", "Title is required");
  }

  const id = `prob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(`
    INSERT INTO diagnostic_problems (
      id, title, description, status, severity, category,
      frontend_url, backend_url, error_message, steps_to_reproduce,
      fix_notes, tested_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, id, title, description || null, status, severity, category,
    frontend_url || null, backend_url || null, error_message || null,
    steps_to_reproduce || null, fix_notes || null, tested_by || null,
    now, now);

  const [problem] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * FROM diagnostic_problems WHERE id = ?
  `, id);

  res.status(201).json(problem);
});

/** GET /api/diagnostic/problems/:id — get a single problem (admin only) */
router.get("/problems/:id", requireAdmin, async (req: AuthedRequest, res) => {
  await ensureProblemsTable();
  const { id } = req.params;

  const [problem] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * FROM diagnostic_problems WHERE id = ?
  `, id);

  if (!problem) {
    throw new HttpError(404, "NOT_FOUND", "Problem not found");
  }

  res.json(problem);
});

/** PATCH /api/diagnostic/problems/:id — update a problem (admin only) */
router.patch("/problems/:id", requireAdmin, async (req: AuthedRequest, res) => {
  await ensureProblemsTable();
  const { id } = req.params;
  const {
    title, description, status, severity, category,
    frontend_url, backend_url, error_message, steps_to_reproduce,
    fix_notes, tested_by, tested_at,
  } = req.body as Record<string, unknown>;

  const existing = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id FROM diagnostic_problems WHERE id = ?
  `, id);

  if (!existing.length) {
    throw new HttpError(404, "NOT_FOUND", "Problem not found");
  }

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) { updates.push("title = ?"); values.push(title); }
  if (description !== undefined) { updates.push("description = ?"); values.push(description); }
  if (status !== undefined) { updates.push("status = ?"); values.push(status); }
  if (severity !== undefined) { updates.push("severity = ?"); values.push(severity); }
  if (category !== undefined) { updates.push("category = ?"); values.push(category); }
  if (frontend_url !== undefined) { updates.push("frontend_url = ?"); values.push(frontend_url); }
  if (backend_url !== undefined) { updates.push("backend_url = ?"); values.push(backend_url); }
  if (error_message !== undefined) { updates.push("error_message = ?"); values.push(error_message); }
  if (steps_to_reproduce !== undefined) { updates.push("steps_to_reproduce = ?"); values.push(steps_to_reproduce); }
  if (fix_notes !== undefined) { updates.push("fix_notes = ?"); values.push(fix_notes); }
  if (tested_by !== undefined) { updates.push("tested_by = ?"); values.push(tested_by); }
  if (tested_at !== undefined) { updates.push("tested_at = ?"); values.push(tested_at); }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await prisma.$executeRawUnsafe(`
    UPDATE diagnostic_problems SET ${updates.join(", ")} WHERE id = ?
  `, ...values);

  const [problem] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * FROM diagnostic_problems WHERE id = ?
  `, id);

  res.json(problem);
});

/** DELETE /api/diagnostic/problems/:id — delete a problem (admin only) */
router.delete("/problems/:id", requireAdmin, async (req: AuthedRequest, res) => {
  await ensureProblemsTable();
  const { id } = req.params;

  const existing = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id FROM diagnostic_problems WHERE id = ?
  `, id);

  if (!existing.length) {
    throw new HttpError(404, "NOT_FOUND", "Problem not found");
  }

  await prisma.$executeRawUnsafe(`DELETE FROM diagnostic_problems WHERE id = ?`, id);
  res.json({ ok: true, id });
});

/** GET /api/diagnostic/health — system health check (admin only) */
router.get("/health", requireAdmin, async (_req, res) => {
  const checks: Record<string, { status: string; message?: string; latency_ms?: number }> = {};

  // Backend health
  const backendStart = Date.now();
  try {
    checks.backend = { status: "ok", message: "Backend is running", latency_ms: Date.now() - backendStart };
  } catch {
    checks.backend = { status: "error", message: "Backend is not responding", latency_ms: Date.now() - backendStart };
  }

  // Database health
  const dbStart = Date.now();
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 as test`);
    checks.database = { status: "ok", message: "Database is connected", latency_ms: Date.now() - dbStart };
  } catch {
    checks.database = { status: "error", message: "Database connection failed", latency_ms: Date.now() - dbStart };
  }

  // Problem count
  await ensureProblemsTable();
  const [countRow] = await prisma.$queryRawUnsafe<{ count: number }[]>(`
    SELECT COUNT(*) as count FROM diagnostic_problems
  `);
  checks.problems = {
    status: "ok",
    message: `${countRow?.count || 0} problems tracked`,
    latency_ms: 0,
  };

  const allOk = Object.values(checks).every(c => c.status === "ok");

  res.json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

/** GET /api/diagnostic/stats — problem statistics (admin only) */
router.get("/stats", requireAdmin, async (_req, res) => {
  await ensureProblemsTable();

  const byStatus = await prisma.$queryRawUnsafe<any[]>(`
    SELECT status, COUNT(*) as count FROM diagnostic_problems GROUP BY status
  `);
  const bySeverity = await prisma.$queryRawUnsafe<any[]>(`
    SELECT severity, COUNT(*) as count FROM diagnostic_problems GROUP BY severity
  `);
  const byCategory = await prisma.$queryRawUnsafe<any[]>(`
    SELECT category, COUNT(*) as count FROM diagnostic_problems GROUP BY category
  `);
  const total = await prisma.$queryRawUnsafe<{ count: number }[]>(`
    SELECT COUNT(*) as count FROM diagnostic_problems
  `);

  res.json({
    total: total[0]?.count || 0,
    byStatus,
    bySeverity,
    byCategory,
  });
});

export default router;