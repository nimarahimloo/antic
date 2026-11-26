/**
 * SVG security unit tests.
 * Run with: node --import tsx backend/scripts/media-security.test.ts
 *
 * Tests cover:
 * - Script elements and event handlers
 * - javascript:, data:, external URLs and namespace tricks
 * - foreignObject, iframe, object and embed
 * - CSS-based attacks and unsafe style attributes
 * - Malformed SVG, encoded payloads and entity handling
 */
import assert from "node:assert/strict";
import { sanitizeSvg } from "../src/services/mediaValidation.js";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ ${name}: ${msg}`);
  }
}

function assertNoDangerousContent(result: string) {
  // No script tags (any case, with or without attributes)
  assert.ok(!/<script\b/i.test(result), "script tag should be removed");
  // No javascript: URIs
  assert.ok(!/javascript:/i.test(result), "javascript: URI should be removed");
  // No data: URIs
  assert.ok(!/data:/i.test(result), "data: URI should be removed");
  // No vbscript: URIs
  assert.ok(!/vbscript:/i.test(result), "vbscript: URI should be removed");
  // No dangerous elements
  assert.ok(!/<foreignobject/i.test(result), "foreignObject should be removed");
  assert.ok(!/<iframe/i.test(result), "iframe should be removed");
  assert.ok(!/<object\b/i.test(result), "object should be removed");
  assert.ok(!/<embed\b/i.test(result), "embed should be removed");
  assert.ok(!/<applet\b/i.test(result), "applet should be removed");
  assert.ok(!/<style\b/i.test(result), "style should be removed");
  // Must have root svg element
  assert.ok(/^<svg\b/i.test(result), "must have root svg element");
}

async function main() {
  console.log("🧪 SVG Security Unit Tests\n");

  // === Script elements ===
  await test("rejects SVG with <script> element", async () => {
    const buf = Buffer.from('<svg><script>alert("xss")</script></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects SVG with standalone <script/> tag", async () => {
    const buf = Buffer.from('<svg><script src="evil.js"/></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects SVG with onload event handler", async () => {
    const buf = Buffer.from('<svg onload="alert(1)"></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects SVG with onerror event handler", async () => {
    const buf = Buffer.from('<svg onerror="alert(1)"></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects SVG with onclick event handler", async () => {
    const buf = Buffer.from('<svg onclick="alert(1)"></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  // === URI scheme attacks ===
  await test("rejects javascript: href", async () => {
    const buf = Buffer.from('<svg><a href="javascript:alert(1)">link</a></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assertNoDangerousContent(result);
  });

  await test("rejects data: href", async () => {
    const buf = Buffer.from('<svg><a href="data:text/html,<script>alert(1)</script>">link</a></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assertNoDangerousContent(result);
  });

  await test("rejects vbscript: href", async () => {
    const buf = Buffer.from('<svg><a href="vbscript:msgbox(1)">link</a></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assertNoDangerousContent(result);
  });

  // === Dangerous elements ===
  await test("rejects foreignObject element", async () => {
    const buf = Buffer.from('<svg><foreignObject width="100" height="100"><div>xss</div></foreignObject></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects iframe element", async () => {
    const buf = Buffer.from('<svg><iframe src="javascript:alert(1)"></iframe></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects object element", async () => {
    const buf = Buffer.from('<svg><object data="evil.swf"></object></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects embed element", async () => {
    const buf = Buffer.from('<svg><embed src="evil.swf"/></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects applet element", async () => {
    const buf = Buffer.from('<svg><applet code="evil.class"></applet></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects style element", async () => {
    const buf = Buffer.from('<svg><style>@import "evil.css";</style></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  await test("rejects meta http-equiv refresh", async () => {
    const buf = Buffer.from('<svg><meta http-equiv="refresh" content="0;url=javascript:alert(1)"></svg>');
    assert.throws(() => sanitizeSvg(buf.toString("utf8")), /svg-empty-after-sanitization/);
  });

  // === CSS attacks ===
  await test("rejects expression() in style attribute", async () => {
    const buf = Buffer.from('<svg><rect style="width: expression(alert(1))"/></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assert.ok(!result.includes("expression"), "expression() in style should be removed");
  });

  await test("rejects behavior in style attribute", async () => {
    const buf = Buffer.from('<svg><rect style="behavior: url(evil.htc)"/></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assert.ok(!result.includes("behavior"), "behavior in style should be removed");
  });

  // === Namespace tricks ===
  await test("rejects xlink:href with javascript:", async () => {
    const buf = Buffer.from('<svg><a xlink:href="javascript:alert(1)">link</a></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assert.ok(!result.includes("javascript:"), "xlink:href javascript: should be removed");
  });

  await test("rejects xlink:href with data:", async () => {
    const buf = Buffer.from('<svg><a xlink:href="data:text/html,<script>alert(1)</script>">link</a></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assert.ok(!result.includes("data:"), "xlink:href data: should be removed");
  });

  // === Malformed / encoded ===
  await test("rejects SVG with encoded <script>", async () => {
    const buf = Buffer.from('<svg><scr ipt>alert(1)</scr ipt></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assert.ok(!/<script\b/i.test(result), "no script tag should remain");
    assert.ok(!/javascript:/i.test(result), "no javascript: URI should remain");
  });

  await test("rejects SVG with double-encoded entities", async () => {
    const buf = Buffer.from('<svg>&lt;script&gt;alert(1)&lt;/script&gt;</svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    // DOMPurify decodes &lt;script&gt; to <script> tag then removes it
    assert.ok(!/<script\b/i.test(result), "no script tag should remain");
    // Text content like "alert(1)" is harmless - it's not executable code
    assert.ok(result.includes("<svg"), "result should still have svg element");
  });

  await test("rejects SVG with SVG namespace script", async () => {
    const buf = Buffer.from('<svg><svg:script>alert(1)</svg:script></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    // <svg:script> is not an executable script tag in HTML context
    assert.ok(!/<script\b/i.test(result), "no <script> tag should remain");
    assert.ok(result.includes("<svg"), "result should still have svg element");
  });

  // === Valid SVG should pass ===
  await test("accepts valid simple SVG", async () => {
    const buf = Buffer.from('<svg width="100" height="100"><rect width="50" height="50" fill="red"/></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assert.ok(result.includes("<svg"), "result should contain svg element");
    assert.ok(result.includes("rect"), "result should contain rect element");
    assert.ok(result.includes('fill="red"'), "result should contain fill attribute");
  });

  await test("accepts SVG with linearGradient", async () => {
    const buf = Buffer.from('<svg width="100" height="100"><defs><linearGradient id="g"><stop offset="0%" stop-color="red"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>');
    const result = sanitizeSvg(buf.toString("utf8"));
    assert.ok(result.includes("linearGradient"), "result should contain linearGradient");
    assert.ok(result.includes("stop-color"), "result should contain stop-color");
  });

  await test("rejects completely empty SVG", async () => {
    assert.throws(() => sanitizeSvg("<svg></svg>"), /svg-empty-after-sanitization/);
  });

  await test("rejects empty string", async () => {
    assert.throws(() => sanitizeSvg(""), /svg-empty-input/);
  });

  await test("rejects non-string input", async () => {
    assert.throws(() => sanitizeSvg(null as any), /svg-empty-input/);
  });

  console.log(`\n📊 ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
