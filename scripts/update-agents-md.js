#!/usr/bin/env node
/**
 * update-agents-md.js — Auto-update AGENTS.md with current project state.
 * Reads package.json, backend/package.json, and key config files to keep
 * AGENTS.md in sync with the actual project configuration.
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const AGENTS_MD = path.join(ROOT, "AGENTS.md");

function readPkg(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  } catch {
    return {};
  }
}

const rootPkg = readPkg(ROOT);
const backendPkg = readPkg(path.join(ROOT, "backend"));

function getScripts(pkg) {
  const scripts = pkg.scripts || {};
  return Object.entries(scripts)
    .map(([k, v]) => `  - "${k}": ${v}`)
    .join("\n");
}

function hasFile(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const lines = [];
lines.push("# AGENTS.md — پرده آنتیک (local)");
lines.push("");
lines.push("دستورالعمل‌های عملیاتی برای ایجنت‌های این ریپو. هر سطر فقط چیزی است که احتمالاً یک ایجنت بدون راهنمایی از دست می‌دهد، یا چیزی که باعث اشتباه می‌شود.");
lines.push("");
lines.push("استک (self-hosted): Next.js 16 App Router + React 19 (`:3000`) و Express/Prisma/SQLite (`:3001`) + زرین‌پال. دو دامنه از هم جدا: **کاتالوگ پرده** (`CurtainCategory`) و **فروشگاه اکدرسوری** (`ShopCategory`) — هرگز مخلوط نشوند.");
lines.push("");
lines.push("## راه‌اندازی لوکال (دو ترمینال، اجباری قبل از تست)");
lines.push("");
lines.push("```bash");
lines.push("# ترمینال ۱ — بک‌اند");
lines.push("cd backend");
lines.push("cp .env.example .env      # backend/.env گیت‌نوراشد و در ریپو نیست؛ نمونه فایل وجود دارد");
lines.push("bun install");
lines.push("bun run db:setup          # prisma generate + db push + seed");
lines.push("bun run dev               # :3001 (tsx watch src/index.ts)");
lines.push("");
lines.push("# ترمینال ۲ — فرانت");
lines.push("bun install");
lines.push("bun run dev               # :3000 — /api و /uploads و /.well-known و /auth.md به بک‌اند پراکسی می‌شوند");
lines.push("```");
lines.push("");
lines.push("- پکیج‌מנجر: **bun** (`packageManager: bun@1.1` در `package.json`). CI از `npm ci` + Node ۲۲ استفاده می‌کند.");
lines.push("- ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`");
lines.push("- سلامت API: `GET http://localhost:3001/api/health`");
lines.push("- توکن JWT در `localStorage` کلید `antic_access_token` (`src/api/token.ts`)");
lines.push("");
lines.push("## محیط و secreto (env)");
lines.push("");
lines.push("- روت `.env` / `.env.example`: فقط متغیرهای فرانت (مثل `NEXT_PUBLIC_API_BASE`), کامنت شده به پیش‌فرض. هرگز کلید/رمز در `NEXT_PUBLIC_*` نباشد.");
lines.push("- `backend/.env`: gitignored، نمونه `backend/.env.example`. شامل `JWT_SECRET` (۳۲+ نویسه)، `ADMIN_*`, `ZARINPAL_*`, `MCP_WORKER_TOKEN`, `AI_*`.");
lines.push("- `BACKEND_INTERNAL_URL` در زمان `build` Next.js در `routes-manifest.json` ثابت می‌شود؛ اگر آدرس بک‌اند عوض شد، دوباره build بگیرید (در داکر از طریق `build.args`).");
lines.push("- استنتاج AI فقط سمت بک‌اند؛ فایل‌های AI در `AI_PRIVATE_DIR`، هرگز زیر `/uploads` عمومی سرو نمی‌شوند.");
lines.push("");
lines.push("## دستورات (ریشه)");
lines.push("");
lines.push("```bash");
lines.push("bun install");
lines.push("bun run lint      # ESLint flat config (backend/، scripts/، prisma/، my-agent/ نادیده گرفته می‌شوند)");
lines.push("bun run typecheck # tsc --noEmit");
lines.push("bun run build     # next build --webpack (ویب‌پاک، نه توربوپاک — برای next-pwa)");
lines.push("");
lines.push("```");
lines.push("");
lines.push("```bash");
lines.push("cd backend");
lines.push("bun install");
lines.push("bun run typecheck      # tsc --noEmit");
lines.push("bun run db:generate    # prisma generate");
lines.push("bun run db:push        # prisma db push");
lines.push("bun run db:seed        # tsx prisma/seed.ts");
lines.push("bun run db:setup       # generate + push + seed");
lines.push("bun run dev            # tsx watch src/index.ts");
lines.push("bun run build          # tsc → dist/ ; bun start → node dist/src/index.js");
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
lines.push("CI (`.github/workflows/typescript-checks.yml`): typecheck فرانت و بک‌اند، تست گیت ارائهدهنده AI، تست Worker MCP، یکپارچگی MCP، و runtime داکر. (تست‌های پرداخت/ZarinPal حذف شدهاند.)");
lines.push("");
lines.push("## دیتابیس");
lines.push("");
lines.push("اسکیمای واحد: `backend/prisma/schema.prisma` (کپی در روت وجود ندارد و ایجاد نکنید). دیتابیس local SQLite: `backend/dev.db`. بعد از تغییر مدل: `cd backend && bun run db:generate && bun run db:push` (یا `bun run db:setup`).");
lines.push("");
lines.push("## دو دامنه دسته (هرگز مخلوط نکنید)");
lines.push("");
lines.push("| دامنه | مدل | API | UI |");
lines.push("| کاتالوگ پرده | `CurtainCategory` | `/api/entities/CurtainCategory` | `useCurtainCategories` |");
lines.push("| فروشگاه اکدرسوری | `ShopCategory` + `Product.categoryId` | `/api/catalog/categories` | `store-catalog` / `useShop` |");
lines.push("");
lines.push("- فروشگاه فقط اکدرسوری؛ به `CurtainCategory` وصل نیست.");
lines.push("- سکشنهای غیر-`/shop` دسته را از `useCurtainCategories` بخوانند — **لیست slug هاردکد ننویسید.**");
lines.push("- کمکها: `src/lib/categoryTree.ts` (`parseSubs`, `getRootCategories`, `getSubOptionsForParent`, `collectSubSlugs`)، `src/lib/installCategories.js` (`isInstallCategory`)، `src/lib/curtainStyleResolve.ts` (`resolveStyle`).");
lines.push("");
lines.push("## کلاینت API (تغییر مهم)");
lines.push("");
lines.push("`src/api/client.ts` حذف شده؛ ماژولهای `src/api/` barrels_export شدهاند در `src/api/index.ts`:");
lines.push("");
lines.push("```ts");
lines.push("import { api, setToken, clearToken } from \"@/api\";");
lines.push("import { useCurtainCategories } from \"@/hooks/useCurtainCategories\";");
lines.push("import { useShop } from \"@/hooks/useShop\";");
lines.push("import { getCurrentCart, addToCart, checkout } from \"@/rest/store-cart\";");
lines.push("import { searchProducts, queryCategories } from \"@/rest/store-catalog\";");
lines.push("```");
lines.push("");
lines.push("- همه ماژولهای فرانت `.ts`/`.tsx` — فایل `.js` همنام با `.ts` بسازید نه (Next.js `.js` را زودتر resolve می‌کند).");
lines.push("- UI فارسی، شناسههای کد انگلیسی.");
lines.push("- پس از تغییر معنادار: `bun run lint` در روت.");
lines.push("- `OptimizedImage` (`src/components/ui/image.tsx`) همیشه `unoptimized={false}` است؛ تصویر بهینه‌سازی میشود و والدین fill همه `relative` + ابعاد دارند.");
lines.push("");
lines.push("## سفارش (تماس با ادمین)");
lines.push("");
lines.push("- درگاه پرداخت (زیرنپال) و صفحه `/checkout` حذف شده است؛ هیچ کدی برای پرداخت آنلاین وجود ندارد.");
lines.push("- محصولات فقط از طریق تماس با ادمین سفارش میشوند (صفحه `/contact` و دکمههای \"تماس بگیرید\" در کارت محصول).");
lines.push("- سبد خرید غیرفعال است (`CART_ENABLED = false`); افزودن به سبد و پرداخت غیر فعال است.");
lines.push("");
lines.push("## اینها را انجام ندهید");
lines.push("");
lines.push("- `CurtainCategory` را با `ShopCategory` مخلوط نکنید.");
lines.push("- `backend/**/*.db` یا هر `.env` را commit نکنید.");
lines.push("- `@/api/client` را import نکنید (حذف شده؛ `@/api` استفاده کنید).");
lines.push("- فایل `.js` همنام با `.ts` موجود بسازید.");
lines.push("- درگاه پرداخت / ZarinPal / checkout را مجدداً اضافه نکنید (سفارش فقط با تماس).");
lines.push("");
lines.push("<!-- BEGIN:nextjs-agent-rules -->");
lines.push("");
lines.push("## This is NOT the Next.js you know");
lines.push("");
lines.push("This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.");
lines.push("");
lines.push("This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.");
lines.push("");
lines.push("<!-- END:nextjs-agent-rules -->");
lines.push("");

const content = lines.join("\n") + "\n";

fs.writeFileSync(AGENTS_MD, content);
console.log("   ✓ AGENTS.md updated");