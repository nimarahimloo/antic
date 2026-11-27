/**
 * Media routes integration tests.
 * Self-contained: starts the backend API against a temporary SQLite database
 * and isolated upload directory, runs all route tests, then cleans up.
 *
 * Run with: npx tsx backend/scripts/media-routes.test.ts
 */
import assert from "node:assert/strict";
import sharp from "sharp";
import { createServer } from "http";
import { prisma } from "../src/lib/prisma.ts";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";

const BASE_PORT = 0; // OS assigns a free port
let server: ReturnType<typeof createServer> | null = null;
let baseUrl: string | null = null;
let adminToken: string | null = null;
let uploadedMediaId: string | null = null;
let tempDbPath: string | null = null;
let tempUploadDir: string | null = null;

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((e) => {
      failed++;
      console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    });
}

async function req(method: string, path: string, body: unknown, token: string | null, opts: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body instanceof FormData) {
    // don't set content-type for FormData
  } else if (body) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    ...opts,
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text() };
  }
  return { status: res.status, data, headers: res.headers };
}

async function login() {
  const res = await req("POST", "/api/auth/login", {
    identifier: "admin@antic.local",
    password: "admin123",
  }, null);
  if (res.status === 200 && (res.data as { token?: string })?.token) {
    adminToken = (res.data as { token: string }).token;
    console.log(`  ℹ Admin token obtained`);
  } else {
    console.log(`  ⚠ Admin login failed (${res.status}), some tests will skip auth`);
    console.log(`    Response:`, JSON.stringify(res.data).slice(0, 200));
  }
}

async function makeJpegBuffer() {
  const img = sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
  });
  return await img.toFormat("jpeg").toBuffer();
}

async function makeAvifBuffer() {
  const img = sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } },
  });
  return await img.toFormat("avif").toBuffer();
}

async function setup() {
  // Create temp directories
  tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "antic-media-test-"));
  tempDbPath = path.join(os.tmpdir(), `antic-media-test-${Date.now()}.db`);

  // Set env vars BEFORE importing the app module
  process.env.DATABASE_URL = `file:${tempDbPath}`;
  process.env.UPLOAD_DIR = tempUploadDir;
  process.env.PORT = "0";
  process.env.NODE_ENV = "test";

  // Ensure upload dir exists
  fs.mkdirSync(tempUploadDir, { recursive: true });

  // Run Prisma migrations against the temp database
  execSync("npx prisma db push", {
    cwd: path.resolve(),
    stdio: "pipe",
    env: { ...process.env },
  });
  console.log(`  ℹ Prisma schema pushed to temp database`);

  // Seed admin user directly
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@antic.local" },
    update: {},
    create: {
      email: "admin@antic.local",
      passwordHash: adminPasswordHash,
      role: "admin",
      fullName: "مدیر سیستم",
    },
  });
  console.log(`  ℹ Admin user seeded`);

  // Dynamically import the app AFTER env vars are set
  const { default: app } = await import("../src/app.ts");

  // Start the server
  server = createServer(app);
  await new Promise((resolve) => server.listen(BASE_PORT, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to get server address");
  baseUrl = `http://127.0.0.1:${addr.port}`;
  console.log(`  ℹ Backend running at ${baseUrl}`);
  console.log(`  ℹ Database: ${tempDbPath}`);
  console.log(`  ℹ Upload dir: ${tempUploadDir}`);

  await login();
}

async function teardown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Clean up temp files
  try {
    if (tempDbPath && fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (tempUploadDir && fs.existsSync(tempUploadDir)) {
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
    }
  } catch {
    // ignore cleanup errors
  }
}

async function main() {
  await setup();

  try {
    console.log("\n🧪 Media API Integration Tests\n");

    await test("POST /api/media uploads a JPEG image", async () => {
      const buf = await makeJpegBuffer();
      const file = new File([buf], "test.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      const res = await req("POST", "/api/media", form, adminToken);
      assert.strictEqual(res.status, 201, `expected 201 got ${res.status}`);
      assert.ok((res.data as { media?: unknown }).media, "media object missing");
      const media = (res.data as { media: { url?: string; mimeType?: string; sha256?: string; id?: string } }).media;
      assert.ok(media.url, "media.url missing");
      assert.ok(media.url.startsWith("/uploads/media/"), "url should be under /uploads/media/");
      assert.strictEqual(media.mimeType, "image/jpeg");
      assert.ok(media.sha256, "sha256 missing");
      uploadedMediaId = media.id;
      console.log(`    media id: ${uploadedMediaId}, url: ${media.url}`);
    });

    await test("POST /api/media uploads an AVIF image", async () => {
      const buf = await makeAvifBuffer();
      const file = new File([buf], "test.avif", { type: "image/avif" });
      const form = new FormData();
      form.append("file", file);
      const res = await req("POST", "/api/media", form, adminToken);
      assert.strictEqual(res.status, 201, `expected 201 got ${res.status}`);
      assert.ok((res.data as { media?: unknown }).media, "media object missing");
      const media = (res.data as { media: { mimeType?: string } }).media;
      assert.strictEqual(media.mimeType, "image/avif");
      assert.ok(media.url.startsWith("/uploads/media/"), "url should be under /uploads/media/");
    });

    await test("POST /api/media dedups identical bytes", async () => {
      const buf = await makeJpegBuffer();
      const file = new File([buf], "test-copy.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      const res = await req("POST", "/api/media", form, adminToken);
      assert.strictEqual(res.status, 200, `expected 200 got ${res.status}`);
      assert.strictEqual((res.data as { reused?: boolean }).reused, true, "should reuse existing media");
      assert.strictEqual(
        (res.data as { media?: { id?: string } }).media?.id,
        uploadedMediaId,
        "should return same media id",
      );
    });

    await test("GET /api/media lists media with pagination", async () => {
      const res = await req("GET", "/api/media?limit=10&offset=0", null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray((res.data as { items?: unknown[] }).items));
      assert.ok(typeof (res.data as { total?: number }).total === "number");
      assert.ok((res.data as { total: number }).total >= 1);
    });

    await test("GET /api/media/:id returns media details", async () => {
      const res = await req("GET", `/api/media/${uploadedMediaId}`, null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.data as { id?: string }).id, uploadedMediaId);
      assert.ok((res.data as { url?: string }).url);
    });

    await test("GET /api/media/:id returns 404 for missing id", async () => {
      const res = await req("GET", "/api/media/nonexistent-id", null, adminToken);
      assert.strictEqual(res.status, 404);
    });

    await test("GET /api/media/:id/usages returns usage info", async () => {
      const res = await req("GET", `/api/media/${uploadedMediaId}/usages`, null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray((res.data as { usages?: unknown[] }).usages));
      assert.ok(typeof (res.data as { count?: number }).count === "number");
    });

    await test("PATCH /api/media/:id updates metadata", async () => {
      const res = await req("PATCH", `/api/media/${uploadedMediaId}`, { alt: "تست Replace", caption: "کاپشن تست" }, adminToken);
      assert.strictEqual(res.status, 200);
      const media = (res.data as { media: { alt?: string; caption?: string } }).media;
      assert.strictEqual(media.alt, "تست Replace");
      assert.strictEqual(media.caption, "کاپشن تست");
    });

    await test("POST /api/media/usages registers usage", async () => {
      const res = await req("POST", "/api/media/usages", {
        mediaId: uploadedMediaId,
        entityType: "Product",
        entityId: "test-product-1",
        fieldName: "image",
      }, adminToken);
      assert.strictEqual(res.status, 201);
      assert.ok((res.data as { usage?: unknown }).usage);
    });

    await test("DELETE /api/media/:id refuses when in use (409)", async () => {
      const res = await req("DELETE", `/api/media/${uploadedMediaId}`, null, adminToken);
      assert.strictEqual(res.status, 409, `expected 409 got ${res.status}`);
    });

    await test("DELETE /api/media/:id?force=true deletes despite usage", async () => {
      const res = await req("DELETE", `/api/media/${uploadedMediaId}?force=true`, null, adminToken);
      assert.strictEqual(res.status, 200);
      assert.strictEqual((res.data as { deleted?: boolean }).deleted, true);
    });

    await test("GET /api/media/:id returns 404 after deletion", async () => {
      const res = await req("GET", `/api/media/${uploadedMediaId}`, null, adminToken);
      assert.strictEqual(res.status, 404);
    });

    await test("POST /api/media rejects non-image file", async () => {
      const file = new File(["not an image"], "fake.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      const res = await req("POST", "/api/media", form, adminToken);
      assert.strictEqual(res.status, 400);
    });

    await test("POST /api/media without auth returns 401", async () => {
      const buf = await makeJpegBuffer();
      const file = new File([buf], "noauth.jpg", { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      const res = await req("POST", "/api/media", form, null);
      assert.strictEqual(res.status, 401);
    });

    console.log(`\n📊 ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  } finally {
    await teardown();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
