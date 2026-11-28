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
- **فضای کاری هوش مصنوعی (`/admin/workspace`):** گفتگوی streaming و پایدار، ابزار کاتالوگ/پروژه، فایل خصوصی و تولید/ویرایش تصویر
- **پرداخت زرین‌پال** (پرداخت نمایشی فقط با فعال‌سازی صریح در محیط توسعه)
- صفحات `/checkout` و `/checkout/result`
- **بازیابی رمز عبور** با توکن یک‌بارمصرف (`/forgot-password` → `/reset-password`)
- **سرور MCP** برای کلاینت‌های هوش مصنوعی (`/connect` → `https://mcp.pardehantic.ir/mcp`)

## راه‌اندازی

```bash
git pull origin main

# ترمینال ۱ — بک‌اند
cd backend
cp .env.example .env
bun install
bun run db:setup   # prisma generate + db push + seed
bun run dev        # http://localhost:3001

# ترمینال ۲ — فرانت
cd ..
bun install
bun run dev        # http://localhost:3000  →  پروکسی /api و /uploads
```

ادمین: `admin@antic.local` / `admin123` → `/login` → `/admin`

> دیتابیس فقط در `backend/` مدیریت می‌شود. اسکیمای یکتا: `backend/prisma/schema.prisma`.
> هیچ کپی دومی از اسکیما در روت وجود ندارد.

### بررسی سلامت

```bash
bun run lint        # ESLint (flat config)
bun run typecheck   # tsc --noEmit
cd backend && bun run test  # backend smoke + functional
npx playwright test --workers=1 --project=chromium  # E2E tests
```

## تست

```bash
# فرانت (Node test runner، بدون نیاز به سرور)
node --test tests/functional/categoryTree.test.ts
node --test tests/functional/installCategories.test.ts
node --test tests/functional/curtainStyleResolve.test.ts

# بک‌اند (نیازمند سرور در حال اجرا روی :3001)
cd backend && bun run test        # smoke + functional
cd backend && bun run smoke       # فقط smoke-test.ts
cd backend && bun run test:functional  # فقط functional-test.ts

# E2E (Playwright Chromium)
npx playwright test --workers=1 --project=chromium
```

## اسکریپت به‌روزرسانی خودکار

در هر دفعه که شاخه `main` آپدیت شود، اسکریپت `scripts/auto-fix-and-update.sh` اجرا می‌شود:
- نصب وابستگی‌ها (bun)
- اجرای ESLint (lint)
- اجرای typecheck فرانت و بک‌اند
- اجرای تست‌های بک‌اند (smoke + functional)
- اجرای تست‌های فرانت (functional)
- اجرای تست‌های E2E (Playwright Chromium)
- به‌روزرسانی AGENTS.md و README.md

```bash
bash scripts/auto-fix-and-update.sh
```

## مجوز

مجازی — پروژه شخصی /_self-hosted_.

