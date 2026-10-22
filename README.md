# پرده آنتیک (antic)

فرانت‌اند React + Vite برای فروشگاه و کاتالوگ تعاملی پرده.

**Phase 1 — مستقل از Base44:** وابستگی runtime به `@base44/sdk` و `@base44/vite-plugin` حذف شده. دیتای entityها در حافظه / `localStorage` (mock) نگهداری می‌شود تا UI و ادمین بدون سرور Base44 بالا بیاید.

فروشگاه محصولات اکسسوری همچنان از **Wix Headless REST** (`src/rest/`) استفاده می‌کند.

## پیش‌نیاز

- Node.js 20+
- npm

## نصب و اجرا

```bash
npm install
npm run dev
```

آدرس پیش‌فرض: [http://localhost:5173](http://localhost:5173)

```bash
npm run build    # خروجی production در dist/
npm run preview  # پیش‌نمایش build
```

## ساختار مهم

| مسیر | توضیح |
|------|--------|
| `src/api/base44Client.js` | mock جایگزین Base44 (entities / auth / functions) — Phase 2 با API واقعی عوض می‌شود |
| `src/rest/` | کلاینت Wix Stores (کاتالوگ و سبد) |
| `src/pages/` | صفحات عمومی + `/admin` |
| `src/lib/catalogData.js` | داده استاتیک دسته‌بندی‌های کاتالوگ |
| `base44/` | اسکیمای entityهای قدیمی (مرجع؛ runtime دیگر به آن وابسته نیست) |

## متغیرهای محیطی (اختیاری)

فایل `.env` در ریشه:

```env
VITE_APP_ID=antic-local
VITE_APP_BASE_URL=http://localhost:5173
# Wix (اگر فروشگاه را به سایت واقعی وصل می‌کنی):
# در src/rest/wix-config.js مقدار WIX_CLIENT_ID را ست کن
```

## احراز هویت محلی

در حالت فعلی همیشه یک کاربر dev (`dev@antic.local`) لاگین فرض می‌شود تا صفحات و پنل ادمین بدون ریدایرکت Base44 باز شوند. CRUD ادمین روی mock کار می‌کند و در `localStorage` با پیشوند `antic-mock-` ذخیره می‌شود.

## فاز بعدی (Phase 2)

- بک‌اند مستقل (Express/Prisma یا مشابه)
- جایگزینی mock با HTTP واقعی
- auth واقعی (JWT / session)
- آپلود فایل و توابع generate*

## لایسنس

خصوصی — nimarahimloo
