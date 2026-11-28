# AGENTS.md — پرده آنتیک (local)

دستورالعمل‌های عملیاتی برای ایجنت‌های این ریپو. هر سطر فقط چیزی است که احتمالاً یک ایجنت بدون راهنمایی از دست می‌دهد، یا چیزی که باعث اشتباه می‌شود.

استک (self-hosted): Next.js 16 App Router + React 19 (`:3000`) و Express/Prisma/SQLite (`:3001`) + زرین‌پال. دو دامنه از هم جدا: **کاتالوگ پرده** (`CurtainCategory`) و **فروشگاه اکدرسوری** (`ShopCategory`) — هرگز مخلوط نشوند.

## راه‌اندازی لوکال (دو ترمینال، اجباری قبل از تست)

```bash
# ترمینال ۱ — بک‌اند
cd backend
cp .env.example .env      # backend/.env گیت‌نوراشد و در ریپو نیست؛ نمونه فایل وجود دارد
bun install
bun run db:setup          # prisma generate + db push + seed
bun run dev               # :3001 (tsx watch src/index.ts)

# ترمینال ۲ — فرانت
bun install
bun run dev               # :3000 — /api و /uploads و /.well-known و /auth.md به بک‌اند پراکسی می‌شوند
```

- پکیج‌מנجر: **bun** (`packageManager: bun@1.1` در `package.json`). CI از `npm ci` + Node ۲۲ استفاده می‌کند.
- ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`
- سلامت API: `GET http://localhost:3001/api/health`
- توکن JWT در `localStorage` کلید `antic_access_token` (`src/api/token.ts`)

## محیط و secreto (env)

- روت `.env` / `.env.example`: فقط متغیرهای فرانت (مثل `NEXT_PUBLIC_API_BASE`), کامنت شده به پیش‌فرض. هرگز کلید/رمز در `NEXT_PUBLIC_*` نباشد.
- `backend/.env`: gitignored، نمونه `backend/.env.example`. شامل `JWT_SECRET` (۳۲+ نویسه)، `ADMIN_*`, `ZARINPAL_*`, `MCP_WORKER_TOKEN`, `AI_*`.
- `BACKEND_INTERNAL_URL` در زمان `build` Next.js در `routes-manifest.json` ثابت می‌شود؛ اگر آدرس بک‌اند عوض شد، دوباره build بگیرید (در داکر از طریق `build.args`).
- استنتاج AI فقط سمت بک‌اند؛ فایل‌های AI در `AI_PRIVATE_DIR`، هرگز زیر `/uploads` عمومی سرو نمی‌شوند.

## دستورات (ریشه)

```bash
bun install
bun run lint      # ESLint flat config (backend/، scripts/، prisma/، my-agent/ نادیده گرفته می‌شوند)
bun run typecheck # tsc --noEmit
bun run build     # next build --webpack (ویب‌پاک، نه توربوپاک — برای next-pwa)

```

```bash
cd backend
bun install
bun run typecheck      # tsc --noEmit
bun run db:generate    # prisma generate
bun run db:push        # prisma db push
bun run db:seed        # tsx prisma/seed.ts
bun run db:setup       # generate + push + seed
bun run dev            # tsx watch src/index.ts
bun run build          # tsc → dist/ ; bun start → node dist/src/index.js
```

## تست

```bash
# فرانت (Node test runner، بدون نیاز به سرور)
node --test tests/functional/categoryTree.test.ts
node --test tests/functional/installCategories.test.ts
node --test tests/functional/curtainStyleResolve.test.ts

# بک‌اند (نیازمند سرور در حال اجرا روی :3001)
cd backend && bun run test        # smoke + functional
cd backend && bun run smoke       # فقط smoke-test.ts
cd backend && bun run test:functional  # فقط functional-test.ts

# E2E (Playwright Chromium)
npx playwright test --workers=1 --project=chromium
```

CI (`.github/workflows/typescript-checks.yml`): typecheck فرانت و بک‌اند، تست گیت ارائهدهنده AI، تست Worker MCP، یکپارچگی MCP، و runtime داکر. (تست‌های پرداخت/ZarinPal حذف شدهاند.)

## دیتابیس

اسکیمای واحد: `backend/prisma/schema.prisma` (کپی در روت وجود ندارد و ایجاد نکنید). دیتابیس local SQLite: `backend/dev.db`. بعد از تغییر مدل: `cd backend && bun run db:generate && bun run db:push` (یا `bun run db:setup`).

## دو دامنه دسته (هرگز مخلوط نکنید)

| دامنه | مدل | API | UI |
| کاتالوگ پرده | `CurtainCategory` | `/api/entities/CurtainCategory` | `useCurtainCategories` |
| فروشگاه اکدرسوری | `ShopCategory` + `Product.categoryId` | `/api/catalog/categories` | `store-catalog` / `useShop` |

- فروشگاه فقط اکدرسوری؛ به `CurtainCategory` وصل نیست.
- سکشنهای غیر-`/shop` دسته را از `useCurtainCategories` بخوانند — **لیست slug هاردکد ننویسید.**
- کمکها: `src/lib/categoryTree.ts` (`parseSubs`, `getRootCategories`, `getSubOptionsForParent`, `collectSubSlugs`)، `src/lib/installCategories.js` (`isInstallCategory`)، `src/lib/curtainStyleResolve.ts` (`resolveStyle`).

## کلاینت API (تغییر مهم)

`src/api/client.ts` حذف شده؛ ماژولهای `src/api/` barrels_export شدهاند در `src/api/index.ts`:

```ts
import { api, setToken, clearToken } from "@/api";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { useShop } from "@/hooks/useShop";
import { getCurrentCart, addToCart, checkout } from "@/rest/store-cart";
import { searchProducts, queryCategories } from "@/rest/store-catalog";
```

- همه ماژولهای فرانت `.ts`/`.tsx` — فایل `.js` همنام با `.ts` بسازید نه (Next.js `.js` را زودتر resolve می‌کند).
- UI فارسی، شناسههای کد انگلیسی.
- پس از تغییر معنادار: `bun run lint` در روت.
- `OptimizedImage` (`src/components/ui/image.tsx`) همیشه `unoptimized={false}` است؛ تصویر بهینه‌سازی میشود و والدین fill همه `relative` + ابعاد دارند.

## سفارش (تماس با ادمین)

- درگاه پرداخت (زیرنپال) و صفحه `/checkout` حذف شده است؛ هیچ کدی برای پرداخت آنلاین وجود ندارد.
- محصولات فقط از طریق تماس با ادمین سفارش میشوند (صفحه `/contact` و دکمههای "تماس بگیرید" در کارت محصول).
- سبد خرید غیرفعال است (`CART_ENABLED = false`); افزودن به سبد و پرداخت غیر فعال است.

## اینها را انجام ندهید

- `CurtainCategory` را با `ShopCategory` مخلوط نکنید.
- `backend/**/*.db` یا هر `.env` را commit نکنید.
- `@/api/client` را import نکنید (حذف شده؛ `@/api` استفاده کنید).
- فایل `.js` همنام با `.ts` موجود بسازید.
- درگاه پرداخت / ZarinPal / checkout را مجدداً اضافه نکنید (سفارش فقط با تماس).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

