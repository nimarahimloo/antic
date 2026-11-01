#!/usr/bin/env node
/**
 * Restores backend/src/lib/adminActions.ts from compressed payload.
 * Safe to run repeatedly (idempotent if already restored).
 */
import fs from "fs";
import zlib from "zlib";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "src/lib/adminActions.ts");
const payload = path.join(root, "src/lib/adminActions.b64.gz.txt");

const MARKER = "executeAdminCommand";
const existing = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
if (existing.includes(MARKER) && existing.includes("listEntity") && existing.includes("createEntity")) {
  console.log("[restore-adminActions] already complete, skip");
  process.exit(0);
}

if (!fs.existsSync(payload)) {
  console.error("[restore-adminActions] missing payload", payload);
  process.exit(1);
}

const b64 = fs.readFileSync(payload, "utf8").trim();
const buf = zlib.gunzipSync(Buffer.from(b64, "base64"));
fs.writeFileSync(out, buf);
console.log("[restore-adminActions] wrote", out, buf.length, "bytes");
