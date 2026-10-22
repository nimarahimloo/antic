# موتور تولید تصویر نصب پرده

## ایده

برای هر **مدل × پارچه × سبک نصب** یک «نمونه واقعی» می‌سازیم — بدون API خارجی و بدون هزینه per-image.

```
قالب chroma (یک عکس نصب واقعی با پارچه سبز برای هر سبک)
        +
عکس تکهٔ پارچه مدل
        ↓
motor (sharp روی سرور / WebGL روی مرورگر)
        ↓
install_image ذخیره روی CurtainModel → بازبینی ادمین → approved برای مشتری
```

## دو مسیر

| مسیر | کجا | کیفیت | مقیاس |
|------|-----|-------|--------|
| **Live WebGL** | مرورگر (`photoRenderer.js`) | بالاتر (شیدر کامل) | تعاملی |
| **Server batch** | `installEngine.ts` + sharp | خوب برای کاتالوگ | ۲۰–۵۰ هزار |

## پیش‌نیاز

1. برای هر سبک (`drape`, `zebra`, `roman`, ...) یک **RenderTemplate** با عکس سبز آپلود کنید (پنل ادمین).
2. هر `CurtainModel` باید فیلد `image` (پارچه) داشته باشد.
3. `npm install` در backend تا `sharp` نصب شود.

## API

```bash
# تولید/کش یک مدل (عمومی — لایو)
GET /api/render/install/:modelId

# صف دسته‌ای (ادمین)
POST /api/render/batch
{ "limit": 500, "regenerate": false }

GET /api/render/batch/status
GET /api/render/stats

# سازگار با فرانت قدیمی
POST /api/functions/generateInstallImage
{ "model_id": "...", "regenerate": true }
```

## CLI

```bash
cd backend
npm run render:batch -- --limit=1000
npm run render:batch -- --limit=5000 --regenerate
```

## ظرفیت تقریبی

- روی یک VPS معمولی (2–4 CPU): حدود **۵۰۰–۲۰۰۰ تصویر/ساعت** بسته به رزولوشن.
- ۵۰٬۰۰۰ مدل ≈ چند روز batch پشت‌سرهم؛ یا تولید **lazy** هنگام اولین بازدید محصول.

## جریان پیشنهادی لانچ

1. آپلود ~۱۰ قالب chroma (یکی برای هر سازوکار).
2. `POST /api/render/batch` با `limit=500` برای تست.
3. بازبینی در پنل → approve.
4. batch بزرگ‌تر یا اتکا به lazy `GET /api/render/install/:id`.

## ارتقای بعدی (اختیاری)

- Worker جدا با Redis queue برای چند ماشین
- Playwright + همان شیدر WebGL برای کیفیت برابر مرورگر
- اتصال LLM فقط برای مشاور، نه برای پیکسل
