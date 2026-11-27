/**
 * Unit tests for mediaValidation service.
 * Run with: npx tsx backend/scripts/media-validation.test.ts
 */
import assert from "node:assert/strict";
import sharp from "sharp";
import { validateMediaFile, sanitizeSvg, computeSha256 } from "../src/services/mediaValidation.ts";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Generate valid minimal images using sharp
async function genImage(format: string) {
  const img = sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
  });
  return await img.toFormat(format as sharp.FormatEnum).toBuffer();
}

interface MediaInfo {
  mimeType: string;
  isSvg: boolean;
  width: number;
  height: number;
  sha256: string;
  safeSvg?: boolean;
}

async function main() {
  console.log("🧪 Media validation unit tests\n");

  const jpegBuf = await genImage("jpeg");
  const pngBuf = await genImage("png");
  const gifBuf = await genImage("gif");
  const webpBuf = await genImage("webp");

  const tests = [
    test("detects JPEG by magic bytes", async () => {
      const info = (await validateMediaFile(jpegBuf)) as MediaInfo;
      assert.strictEqual(info.mimeType, "image/jpeg");
      assert.strictEqual(info.isSvg, false);
      assert(info.width > 0);
      assert(info.height > 0);
      assert(info.sha256);
    }),
    test("detects PNG by magic bytes", async () => {
      const info = (await validateMediaFile(pngBuf)) as MediaInfo;
      assert.strictEqual(info.mimeType, "image/png");
      assert(info.width > 0);
      assert(info.height > 0);
    }),
    test("detects GIF by magic bytes", async () => {
      const info = (await validateMediaFile(gifBuf)) as MediaInfo;
      assert.strictEqual(info.mimeType, "image/gif");
      assert(info.width > 0);
      assert(info.height > 0);
    }),
    test("detects WEBP by magic bytes", async () => {
      const info = (await validateMediaFile(webpBuf)) as MediaInfo;
      assert.strictEqual(info.mimeType, "image/webp");
      assert(info.width > 0);
      assert(info.height > 0);
    }),
    test("detects SVG by magic bytes", async () => {
      const buf = Buffer.from('<?xml version="1.0"?><svg width="100" height="100"><rect width="50" height="50" fill="red"/></svg>');
      const info = (await validateMediaFile(buf)) as MediaInfo;
      assert.strictEqual(info.mimeType, "image/svg+xml");
      assert.strictEqual(info.isSvg, true);
      assert(info.safeSvg);
    }),
    test("rejects renamed executable", async () => {
      const buf = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(100)]);
      await assert.rejects(() => validateMediaFile(buf), /تصویر معتبر نیست/);
    }),
    test("rejects text file", async () => {
      const buf = Buffer.from("this is not an image");
      await assert.rejects(() => validateMediaFile(buf), /شخصی نشد|معتبر نیست/);
    }),
    test("rejects MIME mismatch", async () => {
      await assert.rejects(
        () => validateMediaFile(jpegBuf, { mimeType: "image/png" }),
        /مطابقت ندارد/,
      );
    }),
    test("enforces max size", async () => {
      const buf = Buffer.alloc(13 * 1024 * 1024);
      buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
      await assert.rejects(
        () => validateMediaFile(buf, { maxBytes: 12 * 1024 * 1024 }),
        /مگابایت/,
      );
    }),
    test("sanitizes SVG script tags", () => {
      const dirty = '<svg><script>alert("xss")</script><rect width="10" height="10"/></svg>';
      const clean = sanitizeSvg(dirty);
      assert.ok(!clean.includes("<script>"));
      assert.ok(clean.includes("<rect"));
    }),
    test("sanitizes SVG event handlers", () => {
      const dirty = '<svg onload="alert(1)"><rect width="10" height="10"/></svg>';
      const clean = sanitizeSvg(dirty);
      assert.ok(!clean.includes("onload"));
    }),
    test("sanitizes SVG javascript: href", () => {
      const dirty = '<svg><a href="javascript:alert(1)"><rect width="10" height="10"/></a></svg>';
      const clean = sanitizeSvg(dirty);
      assert.ok(!clean.includes("javascript:"));
    }),
    test("rejects SVG with only dangerous content", () => {
      const dirty = '<svg><script>alert("xss")</script></svg>';
      assert.throws(() => sanitizeSvg(dirty), /svg-empty/);
    }),
    test("rejects empty SVG (no renderable content)", async () => {
      const buf = Buffer.from('<?xml version="1.0"?><svg width="100" height="100"></svg>');
      await assert.rejects(() => validateMediaFile(buf), /svg-empty-after-sanitization/);
    }),
    test("computes stable SHA256", () => {
      const a = computeSha256(Buffer.from("hello"));
      const b = computeSha256(Buffer.from("hello"));
      assert.strictEqual(a, b);
      assert.strictEqual(a.length, 64);
    }),
    test("same bytes produce same sha256", async () => {
      const buf = await genImage("jpeg");
      const i1 = (await validateMediaFile(buf)) as MediaInfo;
      const i2 = (await validateMediaFile(buf)) as MediaInfo;
      assert.strictEqual(i1.sha256, i2.sha256);
    }),
  ];

  await Promise.all(tests);

  console.log(`\n📊 ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
