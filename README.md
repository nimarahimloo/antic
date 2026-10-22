# پرده آنتیک (antic)

فرانت React + Vite + بک‌اند Express/Prisma — **بدون Base44 / Wix / CDN خارجی.**

## قابلیت‌های جدید

- فروشگاه و سبد محلی
- **پنل ادمین:** محصولات فروشگاه + سفارش‌ها
- **پرداخت زرین‌پال** (یا حالت دمو بدون Merchant ID)
- صفحات `/checkout` و `/checkout/result`

## راه‌اندازی

```bash
git pull origin dev

cd backend
cp .env.example .env
npm install
npm run db:setup   # schema + seed
npm run dev

# ترمینال دیگر
cd .. && npm install && npm run dev
```

ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`

### زرین‌پال (`backend/.env`)

```env
ZARINPAL_MERCHANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ZARINPAL_SANDBOX="true"   # false برای پروداکشن
FRONTEND_URL="https://your-domain.ir"
PUBLIC_BASE_URL="https://your-domain.ir"   # یا آدرس API اگر جداست
```

اگر `ZARINPAL_MERCHANT_ID` خالی باشد، checkout در **حالت دمو** مستقیم به صفحه نتیجه موفق می‌رود (بدون درگاه واقعی).

مبالغ فروشگاه به **تومان** است؛ برای زرین‌پال به ریال (`×۱۰`) تبدیل می‌شود.

## مسیرهای مهم

| مسیر | نقش |
|------|------|
| `/shop` | فروشگاه |
| `/checkout` | اطلاعات مشتری + پرداخت |
| `/admin/products` | CRUD محصولات |
| `/admin/orders` | لیست سفارش‌ها |
| `POST /api/orders/checkout` | ایجاد سفارش + لینک پرداخت |
| `GET /api/orders/zarinpal/callback` | بازگشت از درگاه |

## لایسنس

خصوصی — nimarahimloo
