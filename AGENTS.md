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
| فرانت | Next.js + Tailwind + TanStack Query | `:3000` |
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

فرانت (اختیاری در روت):

```env
# NEXT_PUBLIC_API_BASE=/api
# NEXT_PUBLIC_SITE_URL="https://antic-curtain.ir"
```

## نقشهٔ کد (لوکال)

### فرانت (`src/`)

| مسیر | نقش |
|------|-----|
| `src/app/**` | صفحات App Router (Next.js) |
| `src/api/client.ts` | کلاینت HTTP اصلی (`api`) |
| `src/hooks/useCurtainCategories.ts` | **منبع واحد** دسته‌های کاتالوگ |
| `src/rest/store-cart.ts` | سبد + checkout |
| `src/rest/store-catalog.ts` | محصولات/دسته‌های **فروشگاه اکسسوری** |
| `src/lib/AuthContext.tsx` | لاگین/توکن |
| `src/context/CartContext.tsx` | state سبد |

**import ترجیحی:**

```ts
import { api, setToken, clearToken } from "@/api/client";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
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
| `backend/prisma/seed.ts` | seed جدا برای پرده vs اکسسوری |

## قوانین کار ایجنت

### انجام بده

- دسته‌های کاتالوگ فقط از `CurtainCategory` / `useCurtainCategories`.
- دسته‌های فروشگاه فقط از `ShopCategory` / `store-catalog`.
- UI فارسی، شناسه‌های کد انگلیسی.
- بعد از تغییر معنادار: `npm run lint` در روت.

### انجام نده

- مخلوط کردن `CurtainCategory` با `ShopCategory`.
- لیست ثابت slug برای دسته‌های سایت.
- commit کردن `backend/dev.db` یا `.env`.

## خلاصه یک خطی

اپ self-hosted: Next.js + Express + Prisma + SQLite + زرین‌پال.
کاتالوگ پرده و فروشگاه اکسسوری دو دامنهٔ جدا با یک منبع برای هر کدام.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
