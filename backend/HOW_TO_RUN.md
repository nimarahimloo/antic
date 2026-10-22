# antic-backend

بک‌اند مستقل پرده آنتیک — جایگزین کامل Base44.

## Stack

- Node.js + Express + Prisma
- SQLite (لوکال) / می‌توانی `DATABASE_URL` را به PostgreSQL ببری
- JWT auth + bcrypt
- آپلود فایل محلی در `uploads/`

## اجرا

```bash
cd backend
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

API: http://localhost:3001  
Health: http://localhost:3001/api/health

ادمین پیش‌فرض: `admin@antic.local` / `admin123`

## اندپوینت‌ها

| مسیر | توضیح |
|------|--------|
| `POST /api/auth/login` | ورود |
| `POST /api/auth/register` | ثبت‌نام |
| `GET /api/auth/me` | کاربر جاری (Bearer) |
| `GET/POST /api/entities/:Entity` | CRUD موجودیت‌ها |
| `GET/PUT/DELETE /api/entities/:Entity/:id` | یک رکورد |
| `GET /api/entities/:Entity/count` | تعداد |
| `POST /api/upload` | آپلود (ادمین) |
| `POST /api/functions/:name` | توابع stub |
| `GET /api/app/public-settings` | تنظیمات عمومی |

موجودیت‌ها: `CurtainModel`, `CurtainCategory`, `Project`, `ConsultationRequest`, `RenderTemplate`, `InstallReference`, `SavedDesign`, `VirtualWindowSetting`, `User`
