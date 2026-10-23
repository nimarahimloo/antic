# AGENTS.md — پرده آنتیک (local)

این فایل **منبع حقیقت برای هر ایجنت** روی این ریپو است.
همهٔ کارها باید روی **استک لوکال** انجام شود.

## قانون‌های قطعی

1. **بدون Base44، بدون Wix، بدون سرویس commerce خارجی.**
2. skillهای زیر `.agents/skills/wix-*` **منسوخ و اشتباه** هستند — **هرگز نخوان و اجرا نکن.**
3. داده و پرداخت فقط از طریق API لوکال: `http://localhost:3001/api` (در dev از Vite با پروکسی `/api`).
4. قبل از هر تغییر: `README.md` و همین فایل را بخوان.

## استک واقعی

| لایه | تکنولوژی | پورت / مسیر |
|------|----------|-------------|
| فرانت | React 18 + Vite + Tailwind + React Router + TanStack Query | `:5173` |
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
npm run dev            # http://localhost:5173  → پروکسی /api و /uploads
```

- ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`
- سلامت API: `GET http://localhost:3001/api/health`

### env مهم بک‌اند (`backend/.env`)

```env
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-to-a-long-random-string-in-production"
CORS_ORIGIN="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"
PUBLIC_BASE_URL="http://localhost:3001"
ADMIN_EMAIL="admin@antic.local"
ADMIN_PASSWORD="admin123"
ZARINPAL_MERCHANT_ID=""
ZARINPAL_SANDBOX="true"
```

فرانت (اختیاری در روت):

```env
# VITE_API_BASE=/api
# VITE_PROXY_TARGET=http://localhost:3001
```

## نقشهٔ کد (لوکال)

### فرانت (`src/`)

| مسیر | نقش |
|------|-----|
| `src/api/client.js` | کلاینت HTTP اصلی (`api`) — auth، entities، agents، upload، functions |
| `src/api/base44Client.js` | **فقط shim منسوخ** → re-export از `client.js`؛ import جدید ننویس |
| `src/rest/store-cart.js` | سبد `localStorage` + checkout → `POST /api/orders/checkout` |
| `src/rest/store-catalog.js` | کاتالوگ فروشگاه → `/api/catalog` |
| `src/rest/wix-store-*.js` | **shim منسوخ** — از `store-*.js` استفاده کن |
| `src/lib/AuthContext.jsx` | لاگین/ثبت‌نام/توکن (`antic_access_token`) |
| `src/context/CartContext.jsx` | state سبد |
| `src/pages/` | صفحات عمومی + `src/pages/admin/` |
| `src/components/` | UI و بخش‌ها |

**import ترجیحی:**

```js
import { api, setToken, clearToken } from "@/api/client";
import { getCurrentCart, addToCart, checkout } from "@/rest/store-cart";
import { searchProducts, queryCategories } from "@/rest/store-catalog";
```

### بک‌اند (`backend/`)

| مسیر | نقش |
|------|-----|
| `backend/src/app.ts` | ثبت روت‌ها |
| `backend/src/routes/auth.ts` | لاگین / ثبت‌نام / me |
| `backend/src/routes/entities.ts` | CRUD موجودیت‌ها (CurtainModel، Project، …) |
| `backend/src/routes/catalog.ts` | محصولات و دسته‌های فروشگاه |
| `backend/src/routes/orders.ts` | سفارش + زرین‌پال / دمو |
| `backend/src/routes/upload.ts` | آپلود فایل |
| `backend/src/routes/agents.ts` | مشاور طراحی (لوکال) |
| `backend/src/routes/render.ts` | رندر نصب |
| `backend/prisma/schema.prisma` | مدل داده |
| `backend/prisma/seed.ts` | دادهٔ اولیه |

### APIهای مهم

| متد | مسیر | توضیح |
|-----|------|--------|
| GET | `/api/health` | سلامت |
| GET | `/api/app/public-settings` | تنظیمات عمومی |
| POST | `/api/auth/login` | لاگین |
| POST | `/api/auth/register` | ثبت‌نام |
| GET | `/api/auth/me` | کاربر جاری (Bearer) |
| * | `/api/entities/:Entity` | CRUD موجودیت |
| GET | `/api/catalog/products` | لیست محصول فروشگاه |
| POST | `/api/orders/checkout` | ایجاد سفارش + لینک پرداخت |
| GET | `/api/orders/zarinpal/callback` | بازگشت درگاه |
| GET | `/api/orders` | لیست سفارش (ادمین) |

مبالغ فروشگاه: **تومان**. زرین‌پال: **ریال** (`تومان × ۱۰`).

## قوانین کار ایجنت

### انجام بده

- تغییرات را کوچک و متمرکز نگه دار.
- برای داده از `api` / `store-cart` / `store-catalog` و روت‌های `backend` استفاده کن.
- UI فارسی، شناسه‌های کد انگلیسی.
- بعد از تغییر معنادار: `npm run lint` در روت؛ در صورت دست زدن به API بک‌اند، در صورت امکان `cd backend && npm run smoke`.
- رمز و secret را commit نکن؛ فقط `.env.example` را به‌روز کن.

### انجام نده

- نصب یا فراخوانی SDK مربوط به Base44 / Wix.
- خواندن یا پیروی از `.agents/skills/wix-*`.
- اتصال فرانت به دامنه یا API ابری Base44/Wix.
- commit کردن `backend/dev.db`، `.env`، یا فایل‌های داخل `uploads/` با دادهٔ واقعی.

## skill لوکال

اگر ایجنت از Agent Skills پشتیبانی می‌کند، فقط skill همین پروژه معتبر است:

- مسیر: `.agents/skills/antic/SKILL.md`

هر skill با پیشوند `wix-` را نادیده بگیر.

## جریان‌های رایج

### افزودن فیلد به موجودیت

1. `backend/prisma/schema.prisma`
2. `cd backend && npx prisma db push` (یا `npm run db:setup` در dev تمیز)
3. روت/سرویس مربوط در `backend/src/`
4. در صورت نیاز UI در `src/pages` یا `src/components`

### تغییر فروشگاه / checkout

1. کاتالوگ: `backend/src/routes/catalog.ts` + `src/rest/store-catalog.js`
2. سبد: `src/rest/store-cart.js` + `CartContext`
3. پرداخت: `backend/src/routes/orders.ts` + صفحات `Checkout` / `CheckoutResult`

### دیباگ پروکسی

- فرانت باید `:5173` باشد تا `/api` به `:3001` برود (`vite.config.js`).
- اگر API از مرورگر 404 شد، اول `GET /api/health` روی `:3001` را چک کن.

## خلاصه یک خطی

این یک اپ **کاملاً self-hosted** است: Vite + Express + Prisma + SQLite + زرین‌پال.
ایجنت فقط روی همین ریپو و API لوکال کار می‌کند.
