# پرده آنتیک (antic)

فرانت‌اند React + Vite + بک‌اند مستقل (بدون هیچ وابستگی به Base44).

## معماری

```
npm run dev          → Vite :5173  (فرانت)
backend npm run dev  → API  :3001  (Express + Prisma)
Vite proxy: /api و /uploads → backend
```

فروشگاه اکسسوری (`/shop`) همچنان از **Wix Headless** استفاده می‌کند (`src/rest/`).  
مدل‌ها، پروژه‌ها، دسته‌ها، درخواست مشاوره، ادمین و آپلود از **بک‌اند خودمان** می‌آیند.

## پیش‌نیاز

- Node.js 20+

## راه‌اندازی سریع

### ۱. بک‌اند

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup    # prisma generate + db push + seed ادمین
npm run dev
```

ادمین پیش‌فرض: `admin@antic.local` / `admin123`

### ۲. فرانت

```bash
# از ریشه ریپو
npm install
npm run dev
```

باز کن: http://localhost:5173

ورود ادمین: http://localhost:5173/login

## Production

1. `DATABASE_URL` را به PostgreSQL واقعی تغییر بده.
2. `JWT_SECRET` را تصادفی و بلند بگذار.
3. `CORS_ORIGIN` را به دامنه واقعی محدود کن.
4. فرانت: `npm run build` → سرو `dist/`.
5. بک‌اند: `npm start`.

## لایسنس

خصوصی — nimarahimloo
