# AGENTS.md — پرده آنتیک (local)

این فایل **منبع حقیقت برای هر ایجنت** روی این ریپو است.
همهٔ کارها باید روی **استک لوکال** انجام شود.

## قانون‌های قطعی

1. **بدون Base44، بدون Wix، بدون سرویس commerce خارجی.**
2. داده و پرداخت فقط از طریق API لوکال: `http://localhost:3001/api` (در dev از Next.js با پروکسی `/api`).
3. قبل از هر تغییر: `README.md` و همین فایل را بخوان.

## دو دامنهٔ دسته (اجباری)

| دامنه | مدل | API | UI |
|--------|------|-----|-----|
| **کاتالوگ پرده** | `CurtainCategory` (+ `CurtainModel.categorySlug`) | `/api/entities/CurtainCategory` | `useCurtainCategories` |
| **فروشگاه** | `ShopCategory` (+ `Product.categoryId`) | `/api/catalog/categories` | `store-catalog` / `useShop` |

- فروشگاه **فقط اکسسوری** است؛ به `CurtainCategory` وصل نیست.
- هر سکشن سایت غیر از `/shop` باید دسته‌ها را از `useCurtainCategories` بخواند — **لیست slug هاردکد ننویس.**
- helpers: `pickFeaturedCategories`, `pickVisualCategories`, `pickSystemCategories`, `pickSecondaryCategories`.

## استک واقعی

| لایه | تکنولوژی | پورت / مسیر |
|------|----------|-------------|
| فرانت | Next.js 16 (App Router) + React 19 + Tailwind + TanStack Query | `:3000` |
| بک‌اند | Express + Prisma + SQLite + JWT | `:3001` |
| پرداخت | زرین‌پال (خالی بودن `ZARINPAL_MERCHANT_ID` = حالت دمو) | `/api/orders` |
| ادمین | صفحات `/admin/*` | لاگین لازم |

## راه‌اندازی لوکال (اجباری قبل از تست)

```bash
# ترمینال ۱ — بک‌اند
cd backend
cp .env.example .env   # اگر .env ندارید
npm install
npm run db:setup       # prisma generate + db push + seed
npm run dev            # http://localhost:3001

# ترمینال ۲ — فرانت
cd ..
npm install
npm run dev            # http://localhost:3000  → پروکسی /api و /uploads
```

- ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`
- سلامت API: `GET http://localhost:3001/api/health`

### env مهم بک‌اند (`backend/.env`)

```env
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-to-a-long-random-string-in-production"
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
PUBLIC_BASE_URL="http://localhost:3001"
ADMIN_EMAIL="admin@antic.local"
ADMIN_PASSWORD="admin123"
ZARINPAL_MERCHANT_ID=""
ZARINPAL_SANDBOX="true"
```

فرانت (اختیاری در روت `.env`):

```env
# NEXT_PUBLIC_API_BASE=/api
# NEXT_PUBLIC_SITE_URL="https://antic-curtain.ir"
# BACKEND_INTERNAL_URL="http://localhost:3001"
```

> روت `.env` فقط متغیرهای فرانت را دارد؛ کلیدها و رمزها در `backend/.env` هستند.

## نقشهٔ کد (لوکال)

### فرانت (`src/`)

| مسیر | نقش |
|------|-----|
| `src/app/**` | صفحات App Router (Next.js) |
| `src/api/client.ts` | کلاینت HTTP اصلی (`api`) |
| `src/hooks/useCurtainCategories.ts` | **منبع واحد** دسته‌های کاتالوگ |
| `src/hooks/useShop.ts` | حالت فروشگاه (سبد + محصولات) |
| `src/rest/store-cart.ts` | سبد + checkout |
| `src/rest/store-catalog.ts` | محصولات/دسته‌های **فروشگاه اکسسوری** |
| `src/lib/AuthContext.tsx` | لاگین/توکن |
| `src/context/CartContext.tsx` | state سبد |
| `src/lib/categoryTree.ts` | سلسله‌مراتب دسته (مادر در جدول، زیردسته در JSON) |
| `src/lib/installCategories.js` | فیلتر دسته‌های قابل‌نصب (mechanism/slug/name) |
| `src/lib/curtainStyleResolve.js` | تشخیص استایل پرده از slug/mechanism/name |

**import ترجیحی:**

```ts
import { api, setToken, clearToken } from "@/api/client";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { useShop } from "@/hooks/useShop";
import { getCurrentCart, addToCart, checkout } from "@/rest/store-cart";
import { searchProducts, queryCategories } from "@/rest/store-catalog";
```

> همهٔ ماژول‌های فرانت **TypeScript** هستند (`.ts` / `.tsx`). اگر فایل `.js` هم‌نام با `.ts` بسازی، Next.js فایل `.js` را زودتر resolve می‌کند و کد تایپ‌شده را دور می‌زند — چنین duplicate‌ای نساز.

### بک‌اند (`backend/`)

| مسیر | نقش |
|------|-----|
| `backend/src/routes/entities.ts` | CRUD از جمله `CurtainCategory` |
| `backend/src/routes/catalog.ts` | `ShopCategory` + `Product` (اکسسوری) |
| `backend/src/routes/orders.ts` | سفارش + زرین‌پال |
| `backend/src/routes/auth.ts` | احراز هویت (register/login/me/forgot/reset/google) |
| `backend/prisma/schema.prisma` | **تنها** اسکیمای دیتابیس — در روت کپی دومش نیست |
| `backend/prisma/seed.ts` | seed جدا برای پرده vs اکسسوری |

> Prisma فقط در `backend/` است. فرانت هیچ Prisma dependency ندارد و اسکیمای دیتابیس را در روت نگه نمی‌دارد. هر تغییر مدل فقط در `backend/prisma/schema.prisma` انجام می‌شود و بعد `cd backend && npx prisma generate && npx prisma db push`.

## سلسله‌مراتب دسته‌های پرده (CurtainCategory)

- **مادر**: ردیف در جدول `CurtainCategory` با `slug` و `mechanism`
- **زیردسته**: فقط داخل فیلد JSON `subcategories` مادر — **نه ردیف جدا**
- helpers در `src/lib/categoryTree.ts`:
  - `parseSubs` — پارس JSON/string به آرایه
  - `getRootCategories` — فیلتر ریشه‌ها (بدون subslugها، SPACE_ONLY، JUNK_ROOTS)
  - `getSubOptionsForParent` — گزینه‌های `<select>` برای زیردسته
  - `collectSubSlugs` — جمع‌آوری همهٔ slugهای زیردسته

**فیلترهای مهم:**
- `SPACE_ONLY` — فضاهای نمونه‌کار (living-room, bedroom, hotel, villa, ...) که mechanism ندارند
- `JUNK_ROOTS` — slugهای ترکیبی/تکراری که نباید به‌عنوان ریشه باشند (shade-zebra, track-panel, shade-blackout, ...)

## دسته‌های قابل‌نصب (Install Categories)

در `src/lib/installCategories.js`:
- `isInstallCategory(cat)` — true اگر: mechanism داشته باشد، یا slug با الگوهای فنی (FABRIC_HINT) تطبیق دهد، یا نام فارسی فنی داشته باشد
- `filterInstallCategories(categories)` — فیلتر لیست

## تشخیص استایل پرده (curtainStyleResolve)

در `src/lib/curtainStyleResolve.js`:
- `resolveStyle(data, categoryMechanisms)` — برمی‌گرداند: drape/roman/zebra/shade/panel/roller/pleated-*
- اولویت: mechanism صریح → categoryMechanisms map → slug mapping → keyword در name

## دستورات توسعه

```bash
# ریشه
npm run lint        # ESLint (flat config)
npm run typecheck   # tsc --noEmit
npm run build       # next build (Turbopack)

# بک‌اند
cd backend
npm run typecheck   # tsc --noEmit
npm run db:generate # prisma generate
npm run db:push     # prisma db push
npm run db:seed     # seed
npm run db:setup    # generate + push + seed
npm run dev         # tsx watch
npm run build       # tsc → dist/
npm run start       # node dist/src/index.js
npm run test        # smoke + functional (نیاز به سرور در حال اجرا)
npm run smoke       # smoke-test.mjs
npm run test:functional # functional-test.mjs
```

## تست‌ها

```bash
# تست‌های واحد (Node.js test runner)
node --test tests/functional/categoryTree.test.mjs
node --test tests/functional/installCategories.test.mjs
node --test tests/functional/curtainStyleResolve.test.mjs

# تست‌های یکپارچه (نیاز به backend در حال اجرا روی :3001)
cd backend && npm run test
# یا
BASE=http://localhost:3001 node backend/scripts/smoke-test.mjs
BASE=http://localhost:3001 node backend/scripts/functional-test.mjs
```

## احراز هویت و توکن

- JWT با HS256، انقضا ۷ روز، secret در `JWT_SECRET`
- توکن در localStorage (`antic_access_token`) — کلاینت در `src/api/client.ts`
- میدلورهای Express: `optionalAuth`, `requireAuth`, `requireAdmin`
- ثبت‌نام/ورود با ایمیل یا موبایل (normalizePhone)
- بازیابی رمز عبور: `/api/auth/forgot-password` → `/api/auth/reset-password` (توکن یک‌بارمصرف، ۳۰ دقیقه)
- Google OAuth (اختیاری): `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`

## پرداخت زرین‌پال

- `ZARINPAL_MERCHANT_ID` خالی = **حالت دمو** (مستقیم به `/checkout/result?Status=OK` ریدایرکت)
- مبالغ فروشگاه به **تومان**؛ برای زرین‌پال به ریال (`×۱۰`) تبدیل می‌شود
- sandbox: `ZARINPAL_SANDBOX="true"`

## ایمیل (بازیابی رمز)

اگر SMTP تنظیم نشده باشد، ایمیل فقط در لاگ سرچاپ می‌شود.

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="no-reply@example.com"
SMTP_PASS="..."
SMTP_FROM="no-reply@example.com"
```

## مسیرهای مهم API

| مسیر | نقش |
|------|-----|
| `GET /api/health` | سلامت سرور |
| `GET /api/entities/CurtainCategory` | لیست دسته‌های کاتالوگ |
| `GET /api/entities/CurtainModel` | لیست مدل‌های پرده |
| `GET /api/catalog/categories` | دسته‌های فروشگاه (ShopCategory) |
| `GET /api/catalog/products` | محصولات فروشگاه |
| `POST /api/orders/checkout` | ایجاد سفارش + لینک پرداخت |
| `GET /api/orders/zarinpal/callback` | بازگشت از درگاه |
| `POST /api/auth/forgot-password` | درخواست لینک بازیابی |
| `POST /api/auth/reset-password` | ثبت رمز عبور جدید |
| `GET /api/app/public-settings` | تنظیمات عمومی (logo, hero slides, ...) |
| `GET /sitemap.xml` | از دیتابیس تولید می‌شود |
| `GET /robots.txt` | اشاره به sitemap |

## استقرار (Docker)

```bash
# متغیرهای محیطی
export JWT_SECRET="یک-رشته-تصادفی-بلند"
export ADMIN_PASSWORD="رمز-قوی"
export CORS_ORIGIN="https://your-domain.ir"
export FRONTEND_URL="https://your-domain.ir"
export PUBLIC_BASE_URL="https://your-domain.ir"

docker compose up -d --build
```

- فرانت: `http://localhost:3000` (Next.js standalone)
- بک‌اند: `http://localhost:3001` (Express)
- دیتابیس SQLite و آپلود در volumeهای `backend_data` / `backend_uploads`

> **مهم:** Next.js مقدار `rewrites()` را در زمان `build` در `routes-manifest.json` ثابت می‌کند. `BACKEND_INTERNAL_URL` باید **هنگام build** مشخص باشد (در compose به‌صورت `build.args` پاس داده می‌شود). اگر آدرس بک‌اند عوض شد، باید دوباره build بگیرید.

### استقرار بدون Docker

```bash
# فرانت
NEXT_OUTPUT_STANDALONE=true npm run build
node .next/standalone/server.js

# بک‌اند
cd backend
npm install
npm run build        # tsc → dist/
npm start            # node dist/src/index.js
```

## قوانین کار ایجنت

### انجام بده

- دسته‌های کاتالوگ فقط از `CurtainCategory` / `useCurtainCategories`.
- دسته‌های فروشگاه فقط از `ShopCategory` / `store-catalog`.
- UI فارسی، شناسه‌های کد انگلیسی.
- بعد از تغییر معنادار: `npm run lint` در روت.
- تغییر مدل دیتابیس: فقط `backend/prisma/schema.prisma` → `cd backend && npx prisma generate && npx prisma db push`.

### انجام نده

- مخلوط کردن `CurtainCategory` با `ShopCategory`.
- لیست ثابت slug برای دسته‌های سایت.
- commit کردن `backend/prisma/dev.db` یا هر `.env`.
- ساختن کپی دوم از `prisma/schema.prisma` در روت.
- ساختن فایل `.js` هم‌نام با `.ts` موجود.

## خلاصه یک خطی

اپ self-hosted: Next.js 16 + Express + Prisma + SQLite + زرین‌پال.
کاتالوگ پرده و فروشگاه اکسسوری دو دامنهٔ جدا با یک منبع برای هر کدام.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->