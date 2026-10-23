#!/usr/bin/env node
/**
 * One-time migration: download former CDN images into public/images/migrated.
 * Runtime does NOT depend on Base44/Wix — only this script hits old URLs if files are missing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public/images/migrated");
const URLS = [
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/16a76f542_generated_ec73a1e0.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/1ceb84025_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/2be489b62_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/4c8e23e61_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/54eb13e59_generated_65d4aa25.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/58350d5ba_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/5e52b786a_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/612f3961a_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/6414c7e99_generated_d7c22136.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/7480c6599_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/7a46ed465_generated_51ab05dc.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/882904d61_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/8c6626aaa_generated_5c431a17.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/a47c8d6f2_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/a585df441_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/b585b8cc6_generated_0defa845.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/cf6b3783d_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/d38089208_generated_14b2bdde.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/dc534e002_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e29f4aed1_generated_image.png",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e47e7a9fe_generated_7545d3f6.jpg",
  "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e69ba0d39_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/0446284ac_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/1ca0577bc_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/54703cd90_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/675321637_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/74a24478c_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/ab56b3eb8_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/c6d00c248_generated_image.png",
  "https://media.base44.com/images/public/6a9f2608f4053feec0b4cb03/d6f6d9ef9_generated_image.png",
  "https://static.wixstatic.com/media/12d367_4f26ccd17f8f4e3a8958306ea08c2332~mv2.png",
];

fs.mkdirSync(outDir, { recursive: true });

let ok = 0, fail = 0;
for (const url of URLS) {
  const fname = url.split("/").pop().replace(/~/g, "_");
  const dest = path.join(outDir, fname);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 200) {
    console.log("skip", fname);
    ok++;
    continue;
  }
  try {
    const res = await fetch(url, { headers: { "User-Agent": "antic-migrate" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) throw new Error("too small");
    fs.writeFileSync(dest, buf);
    console.log("OK", fname, buf.length);
    ok++;
  } catch (e) {
    console.error("FAIL", fname, e.message);
    fail++;
  }
}
console.log(`done ok=${ok} fail=${fail} → ${outDir}`);
