# پرده آنتیک (antic)

فرانت **Next.js 16 (App Router) + React 19 + Tailwind** و بک‌اند **Express/Prisma/SQLite** — **بدون Base44 / Wix / CDN خارجی.**

## دامنه داده

| دامنه | مدل‌ها | صفحه |
|--------|--------|------|
| **کاتالوگ پرده** | `CurtainCategory` + `CurtainModel` | `/catalog` |
| **فروشگاه** | `ShopCategory` + `Product` — **فقط اکسسوری** | `/shop` |

فروشگاه به دسته‌های پرده وصل نیست؛ فقط اکسسوری و زیردسته‌هایش.

## قابلیت‌ها

- فروشگاه اکسسوری و سبد محلی
- **پنل ادمین:** محصولات فروشگاه + سفارش‌ها + دسته‌های پرده
- **پرداخت زرین‌پال** (یا حالت دمو بدون Merchant ID)
- صفحات `/checkout` و `/checkout/result`
- **بازیابی رمز عبور** با توکن یک‌بارمصرف (`/forgot-password` → `/reset-password`)
- **سرور MCP** برای کلاینت‌های هوش مصنوعی (`/connect` → `/api/mcp`)

## راه‌اندازی

```bash
git pull origin dev

# ترمینال ۱ — بک‌اند
cd backend
cp .env.example .env
npm install
npm run db:setup   # prisma generate + db push + seed
npm run dev        # http://localhost:3001

# ترمینال ۲ — فرانت
cd ..
npm install
npm run dev        # http://localhost:3000  →  پروکسی /api و /uploads
```

ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`

### بررسی سلامت

```bash
npm run lint        # ESLint (flat config)
npm run typecheck   # tsc --noEmit
npm run build       # next build (Turbopack)

cd backend && npm run typecheck
curl http://localhost:3001/api/health
```

### زرین‌پال (`backend/.env`)

```env
ZARINPAL_MERCHANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ZARINPAL_SANDBOX="true"   # false برای پروداکشن
FRONTEND_URL="https://your-domain.ir"
PUBLIC_BASE_URL="https://your-domain.ir"   # یا آدرس API اگر جداست
```

اگر `ZARINPAL_MERCHANT_ID` خالی باشد، checkout در **حالت دمو** مستقیم به صفحه نتیجه موفق می‌رود (بدون درگاه واقعی).

مبالغ فروشگاه به **تومان** است؛ برای زرین‌پال به ریال (`×۱۰`) تبدیل می‌شود.

### ایمیل (بازیابی رمز عبور)

اگر SMTP تنظیم نشده باشد، ایمیل بازیابی فقط در لاگ سرچاپ می‌شود (حالت توسعه).

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="no-reply@example.com"
SMTP_PASS="..."
SMTP_FROM="no-reply@example.com"
```

## مسیرهای مهم

| مسیر | نقش |
|------|------|
| `/catalog` | کاتالوگ پرده (CurtainCategory) |
| `/shop` | فروشگاه اکسسوری |
| `/checkout` | اطلاعات مشتری + پرداخت |
| `/admin` | دسته‌های پرده + محصولات اکسسوری + سفارش‌ها |
| `POST /api/orders/checkout` | ایجاد سفارش + لینک پرداخت |
| `GET /api/orders/zarinpal/callback` | بازگشت از درگاه |
| `POST /api/auth/forgot-password` | درخواست لینک بازیابی |
| `POST /api/auth/reset-password` | ثبت رمز عبور جدید |

## استقرار (Docker)

```bash
# خروجی مستقل Next.js
NEXT_OUTPUT_STANDALONE=true npm run build

docker compose up -d --build
```

- فرانت: `http://localhost:3000`
- بک‌اند: `http://localhost:3001`

## لایسنس

خصوصی — nimarahimloo
