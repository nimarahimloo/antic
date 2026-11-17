# antic-backend

## Setup

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

API: http://localhost:3001  
Admin seed: `admin@antic.local` / `admin123`

## Smoke test

با سرور در حال اجرا:

```bash
npm run smoke
# یا
BASE=http://localhost:3001 npm run smoke
```

این اسکریپت چک می‌کند: health، login ادمین، entities، مشاوره، کاتالوگ، checkout دمو (دو بار برای unique authority)، سفارش‌ها.

## Production notes

- `JWT_SECRET` را حتماً عوض کنید
- `CORS_ORIGIN` و `FRONTEND_URL` و `PUBLIC_BASE_URL` را دامنه واقعی بگذارید
- برای Postgres: در `schema.prisma` provider را `postgresql` کنید و `DATABASE_URL` را ست کنید
