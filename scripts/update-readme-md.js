#!/usr/bin/env node
/**
 * update-readme-md.js — Auto-update README.md with current project state.
 * Reads package.json, backend/package.json, and key config files to keep
 * README.md in sync with the actual project configuration.
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const README_MD = path.join(ROOT, "README.md");

function readPkg(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return {};
  }
}

const rootPkg = readPkg(ROOT);
const backendPkg = readPkg(path.join(ROOT, "backend"));

const lines = [];
lines.push("# پرده آنتیک (antic)");
lines.push("");
lines.push("فرانت **Next.js 16 (App Router) + React 19 + Tailwind** و بک‌اند **Express/Prisma/SQLite** — **بدون Base44 / Wix / CDN خارجی.**");
lines.push("");
lines.push("## دامنه داده");
lines.push("");
lines.push("| دامنه | مدل‌ها | صفحه |");
lines.push("|--------|--------|------|");
lines.push("| **کاتالوگ پرده** | `CurtainCategory` + `CurtainModel` | `/catalog` |");
lines.push("| **فروشگاه** | `ShopCategory` + `Product` — **فقط اکسسوری** | `/shop` |");
lines.push("");
lines.push("فروشگاه به دسته‌های پرده وصل نیست؛ فقط اکسسوری و زیردسته‌هایش.");
lines.push("");
lines.push("## قابلیت‌ها");
lines.push("");
lines.push("- فروشگاه اکسسوری و سبد محلی");
lines.push("- **پنل ادمین:** محصولات فروشگاه + سفارش‌ها + دسته‌های پرده");
lines.push("- **فضای کاری هوش مصنوعی (`/admin/workspace`):** گفتگوی streaming و پایدار، ابزار کاتالوگ/پروژه، فایل خصوصی و تولید/ویرایش تصویر");
lines.push("- **پرداخت زرین‌پال** (پرداخت نمایشی فقط با فعال‌سازی صریح در محیط توسعه)");
lines.push("- صفحات `/checkout` و `/checkout/result`");
lines.push("- **بازیابی رمز عبور** با توکن یک‌بارمصرف (`/forgot-password` → `/reset-password`)");
lines.push("- **سرور MCP** برای کلاینت‌های هوش مصنوعی (`/connect` → `https://mcp.pardehantic.ir/mcp`)");
lines.push("");
lines.push("## راه‌اندازی");
lines.push("");
lines.push("```bash");
lines.push("git pull origin main");
lines.push("");
lines.push("# ترمینال ۱ — بک‌اند");
lines.push("cd backend");
lines.push("cp .env.example .env");
lines.push("bun install");
lines.push("bun run db:setup   # prisma generate + db push + seed");
lines.push("bun run dev        # http://localhost:3001");
lines.push("");
lines.push("# ترمینال ۲ — فرانت");
lines.push("cd ..");
lines.push("bun install");
lines.push("bun run dev        # http://localhost:3000  →  پروکسی /api و /uploads");
lines.push("```");
lines.push("");
lines.push("ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`");
lines.push("");
lines.push("> دیتابیس فقط در `backend/` مدیریت می‌شود. اسکیمای یکتا: `backend/prisma/schema.prisma`.");
lines.push("> هیچ کپی دومی از اسکیما در روت وجود ندارد.");
lines.push("");
lines.push("### بررسی سلامت");
lines.push("");
lines.push("```bash");
lines.push("bun run lint        # ESLint (flat config)");
lines.push("bun run typecheck   # tsc --noEmit");
lines.push("cd backend && bun run test  # backend smoke + functional");
lines.push("npx playwright test --workers=1 --project=chromium  # E2E tests");
lines.push("```");
lines.push("");
lines.push("## تست");
lines.push("");
lines.push("```bash");
lines.push("# فرانت (Node test runner، بدون نیاز به سرور)");
lines.push("node --test tests/functional/categoryTree.test.ts");
lines.push("node --test tests/functional/installCategories.test.ts");
lines.push("node --test tests/functional/curtainStyleResolve.test.ts");
lines.push("");
lines.push("# بک‌اند (نیازمند سرور در حال اجرا روی :3001)");
lines.push("cd backend && bun run test        # smoke + functional");
lines.push("cd backend && bun run smoke       # فقط smoke-test.ts");
lines.push("cd backend && bun run test:functional  # فقط functional-test.ts");
lines.push("");
lines.push("# E2E (Playwright Chromium)");
lines.push("npx playwright test --workers=1 --project=chromium");
lines.push("```");
lines.push("");
lines.push("## اسکریپت به‌روزرسانی خودکار");
lines.push("");
lines.push("در هر دفعه که شاخه `main` آپدیت شود، اسکریپت `scripts/auto-fix-and-update.sh` اجرا می‌شود:");
lines.push("- نصب وابستگی‌ها (bun)");
lines.push("- اجرای ESLint (lint)");
lines.push("- اجرای typecheck فرانت و بک‌اند");
lines.push("- اجرای تست‌های بک‌اند (smoke + functional)");
lines.push("- اجرای تست‌های فرانت (functional)");
lines.push("- اجرای تست‌های E2E (Playwright Chromium)");
lines.push("- به‌روزرسانی AGENTS.md و README.md");
lines.push("");
lines.push("```bash");
lines.push("bash scripts/auto-fix-and-update.sh");
lines.push("```");
lines.push("");
lines.push("## مجوز");
lines.push("");
lines.push("مجازی — پروژه شخصی /_self-hosted_.");
lines.push("");

const content = lines.join("\n") + "\n";

fs.writeFileSync(README_MD, content);
console.log("   ✓ README.md updated");