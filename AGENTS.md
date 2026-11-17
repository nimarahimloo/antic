# AGENTS.md — پرده آنتیک (local)

این فایل **منبع حقیقت برای هر ایجنت** روی این ریپو است.
همهٔ کارها باید روی **استک لوکال** انجام شود.

## قانون‌های قطعی

1. **بدون Base44، بدون Wix، بدون سرویس commerce خارجی.**
2. skillهای زیر `.agents/skills/wix-*` **منسوخ و اشتباه** هستند — **هرگز نخوان و اجرا نکن.**
3. داده و پرداخت فقط از طریق API لوکال: `http://localhost:3001/api` (در dev از Vite با پروکسی `/api`).
4. قبل از هر تغییر: `README.md` و همین فایل را بخوان.

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
| `src/api/client.js` | کلاینت HTTP اصلی (`api`) |
| `src/api/base44Client.js` | **فقط shim منسوخ** → re-export از `client.js` |
| `src/hooks/useCurtainCategories.js` | **منبع واحد** دسته‌های کاتالوگ |
| `src/rest/store-cart.js` | سبد + checkout |
| `src/rest/store-catalog.js` | محصولات/دسته‌های **فروشگاه اکسسوری** |
| `src/rest/wix-store-*.js` | **shim منسوخ** |
| `src/lib/AuthContext.jsx` | لاگین/توکن |
| `src/context/CartContext.jsx` | state سبد |

**import ترجیحی:**

```js
import { api, setToken, clearToken } from "@/api/client";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { getCurrentCart, addToCart, checkout } from "@/rest/store-cart";
import { searchProducts, queryCategories } from "@/rest/store-catalog";
```

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
- SDK مربوط به Base44 / Wix.
- commit کردن `backend/dev.db` یا `.env`.

## خلاصه یک خطی

اپ self-hosted: Vite + Express + Prisma + SQLite + زرین‌پال.
کاتالوگ پرده و فروشگاه اکسسوری دو دامنهٔ جدا با یک منبع برای هر کدام.
