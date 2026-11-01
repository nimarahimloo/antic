#!/usr/bin/env node
/**
 * Restores backend/src/lib/adminActions.ts from compressed payload parts.
 */
import fs from "fs";
import zlib from "zlib";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "src/lib/adminActions.ts");
const lib = path.join(root, "src/lib");

const existing = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
if (existing.includes("executeAdminCommand") && existing.includes("listEntity") && existing.includes("createEntity")) {
  console.log("[restore-adminActions] already complete, skip");
  process.exit(0);
}

const parts = [];
for (let i = 0; i < 10; i++) {
  const p = path.join(lib, `adminActions.b64.part${i}.txt`);
  if (!fs.existsSync(p)) break;
  parts.push(fs.readFileSync(p, "utf8").trim());
}
if (!parts.length) {
  const single = path.join(lib, "adminActions.b64.gz.txt");
  if (fs.existsSync(single)) parts.push(fs.readFileSync(single, "utf8").trim());
}
if (!parts.length) {
  console.error("[restore-adminActions] missing payload parts");
  process.exit(1);
}

const b64 = parts.join("");
const buf = zlib.gunzipSync(Buffer.from(b64, "base64"));
fs.writeFileSync(out, buf);
console.log("[restore-adminActions] wrote", out, buf.length, "bytes from", parts.length, "parts");
