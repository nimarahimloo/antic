# پرده آنتیک (antic)

فرانت‌اند React + Vite + بک‌اند Express/Prisma — **بدون وابستگی به Base44، Wix یا CDN خارجی.**

مناسب استقرار روی سرور ایران.

## معماری

```
npm run dev          → Vite :5173
backend npm run dev  → API  :3001
Vite proxy: /api و /uploads → backend
```

| بخش | منبع داده |
|------|-----------|
| مدل پرده / پروژه / مشاوره / ادمین | بک‌اند خودت (`/api/entities`) |
| فروشگاه اکسسوری `/shop` | بک‌اند (`/api/catalog`) |
| سبد خرید | `localStorage` (بدون درگاه خارجی) |
| فونت | سیستمی (Tahoma / Vazirmatn اگر روی OS باشد) |

## راه‌اندازی

### بک‌اند

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup   # بعد از هر تغییر schema
npm run dev
```

ادمین: `admin@antic.local` / `admin123`

### فرانت

```bash
npm install
npm run dev
```

http://localhost:5173 — ورود ادمین: `/login`

## استقرار سرور ایران

1. `git clone` و `checkout dev`
2. بک‌اند: `JWT_SECRET`، `CORS_ORIGIN=https://دامنه.ir`، `PUBLIC_BASE_URL=https://دامنه.ir`
3. `npm run db:setup && npm start` (یا pm2)
4. فرانت: `npm run build` → nginx روی `dist/` با پروکسی `/api` و `/uploads` به پورت ۳۰۰۱

پرداخت آنلاین هنوز وصل نیست؛ checkout سبد به صفحه تماس هدایت می‌شود.

## لایسنس

خصوصی — nimarahimloo
