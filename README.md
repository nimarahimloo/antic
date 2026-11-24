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
bun run build       # next build (Turbopack)

cd backend && bun run typecheck
curl http://localhost:3001/api/health
```

### زرین‌پال (`backend/.env`)

```env
ZARINPAL_MERCHANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ZARINPAL_SANDBOX="true"   # false برای پروداکشن
FRONTEND_URL="https://your-domain.ir"
PUBLIC_BASE_URL="https://your-domain.ir"   # یا آدرس API اگر جداست
```

در محیط توسعه، برای تست بدون تراکنش واقعی می‌توانید `ZARINPAL_DEMO_MODE=true` را صریحاً تنظیم کنید؛ این حالت فقط وقتی `NODE_ENV` برابر `production` نباشد فعال است. در Production اگر `ZARINPAL_MERCHANT_ID` تنظیم نشده باشد، checkout با خطای 503 متوقف می‌شود و هیچ سفارشی paid نمی‌شود. برای انتشار واقعی، Merchant ID معتبر و `ZARINPAL_SANDBOX=false` را از Secret Manager محیط اجرا تنظیم کنید.

مبالغ فروشگاه به **تومان** است؛ برای زرین‌پال به ریال (`×۱۰`) تبدیل می‌شود. قیمت، نام، تصویر، گزینهٔ انتخاب‌شده و موجودی هر قلم هنگام Checkout از دیتابیس اعتبارسنجی می‌شوند؛ قیمت و جمع ارسالی مرورگر مرجع محاسبهٔ پرداخت نیستند.

### فضای کاری هوش مصنوعی

فضای کاری داخل پنل ادمین و مسیر `/admin/workspace` قرار دارد. inference فقط روی backend و با ارائه‌دهندهٔ خارجی واقعی انجام می‌شود؛ هیچ پاسخ mock یا fallback محلی وجود ندارد.

- گفتگوی streaming با AI SDK 7 و ذخیرهٔ دائمی پیام‌ها در Prisma/SQLite
- انتخاب خودکار مدل با failover سلامت‌محور یا انتخاب دستی Provider/Model از فهرست مدل‌های فعال و سازگار با ابزارها
- ابزارهای داخلی Workspace از طریق AI SDK مستقیماً همان توابع دامنهٔ `aiCatalog` را اجرا می‌کنند؛ Workspace برای فراخوانی ابزارهای داخلی به Worker خودش HTTP نمی‌زند و هیچ network hop اضافه‌ای به سایت تحمیل نمی‌کند.
- Worker موجود `mcp.pardehantic.ir/mcp` فقط درگاه MCP عمومی برای کلاینت‌های خارجی است: Streamable HTTP را مدیریت می‌کند و ابزارهای فقط‌خواندنی کاتالوگ/پروژه را به Backend bridge می‌کند؛ Worker مسئول inference، انتخاب مدل، فایل‌های خصوصی یا مدیریت Gateway نیست.
- مسیر داخلی `POST /api/mcp/tools/:name` فقط از Worker معتبر با `MCP_WORKER_TOKEN` درخواست می‌پذیرد؛ کلاینت‌های خارجی باید به آدرس عمومی `https://mcp.pardehantic.ir/mcp` وصل شوند، نه مسیر داخلی Backend. همان secret باید در `backend/.env` و تنظیمات Secretهای Worker با نام یکسان تنظیم شود. مقدار واقعی هرگز در Git ذخیره نشود.
- Gateway موجود Cloudflare با شناسهٔ `nvidia-m` دارای `multiprovider_enabled=true` است و Secrets Store اختصاصی `ai-gateway-provider-keys` نیز ساخته و به Gateway متصل شده است.
- در آخرین بررسی، Provider Configurations هنوز خالی بود؛ فعال‌سازی multiprovider و اتصال Secrets Store به‌تنهایی به معنی اتصال Providerها نیست.
- Adapterهای Google/NVIDIA/OpenRouter در Backend مستقل باقی می‌مانند. در وضعیت فعلی، مسیر آن‌ها هنوز مستقیم است و تا زمان تکمیل و تست انتقال هر Adapter به Gateway نباید ترافیکشان را Gateway-routed معرفی کرد.
- برای ثبت BYOK هر Provider به کلید معتبر همان Provider نیاز است. کلیدها باید از طریق Secrets Store/Provider Keys ثبت شوند؛ هرگز در Git، فایل `.env.example` یا پیام گفتگو قرار نگیرند.
- تولید و ویرایش تصویر با FLUX.2 و حداکثر چهار تصویر مرجع
- فایل‌های ورودی و خروجی خصوصی در `AI_PRIVATE_DIR`؛ این فایل‌ها زیر `/uploads` عمومی قرار نمی‌گیرند
- محدودیت روزانهٔ درخواست، توکن و بودجهٔ محافظه‌کارانهٔ Cloudflare

```env
# backend/.env
AI_PRIVATE_DIR="./data/ai"

CLOUDFLARE_ACCOUNT_ID="..."
CLOUDFLARE_API_TOKEN="..."
CLOUDFLARE_AI_GATEWAY_ID="nvidia-m"
AI_ENABLE_CLOUDFLARE=true
# Required for the external MCP Worker ↔ Backend bridge.
# Configure the identical secret in the Cloudflare Worker dashboard.
MCP_WORKER_TOKEN="replace-with-a-long-random-secret"

# NVIDIA — کلید فقط در Secret Manager محیط اجرا
NVIDIA_API_KEY=""
AI_ENABLE_NVIDIA=true

# اختیاری و با فعال‌سازی صریح؛ فقط مدل‌های allowlist شده
GOOGLE_GENERATIVE_AI_API_KEY=""
AI_ENABLE_GOOGLE=false
OPENROUTER_API_KEY=""
AI_ENABLE_OPENROUTER=false

AI_MAX_OUTPUT_TOKENS=2500
AI_DAILY_CHAT_REQUESTS=50
AI_DAILY_IMAGE_REQUESTS=10
AI_DAILY_TOTAL_TOKENS=200000
AI_CLOUDFLARE_DAILY_QUOTA_UNITS=9000
```

Cloudflare Workers AI سهمیهٔ رایگان مشترک **۱۰٬۰۰۰ Neuron در روز** دارد که در `00:00 UTC` بازنشانی می‌شود. مقدار محلی `AI_CLOUDFLARE_DAILY_QUOTA_UNITS` یک محافظ تقریبی است؛ مصرف واقعی Neuron باید در داشبورد Cloudflare بررسی شود. در Workers Free پس از تمام‌شدن سهمیه درخواست‌ها شکست می‌خورند و overage ندارند. اگر حساب Workers Paid است، قبل از فعال‌سازی مصرف پولی، سقف سرویس و هزینه را بررسی کنید.

توکن Cloudflare، کلید Gemini/OpenRouter و فایل‌های خصوصی هرگز به bundle مرورگر یا پاسخ عمومی منتقل نمی‌شوند. همهٔ endpointهای `/api/ai/*` فقط برای ادمین معتبر فعال‌اند.

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
| `/admin/workspace` | گفتگوی AI، ابزارهای پروژه/کاتالوگ و استودیوی تصویر |
| `POST /api/ai/chat` | گفتگوی streaming هوش مصنوعی (ادمین) |
| `POST /api/ai/images/generate` | تولید/ویرایش FLUX.2 با تصاویر مرجع (ادمین) |
| `POST /api/orders/checkout` | ایجاد سفارش + لینک پرداخت |
| `GET /api/orders/zarinpal/callback` | بازگشت از درگاه |
| `POST /api/auth/forgot-password` | درخواست لینک بازیابی |
| `POST /api/auth/reset-password` | ثبت رمز عبور جدید |

## استقرار (Docker)

```bash
# فایل محیطی Backend را بسازید و همهٔ Placeholderها را جایگزین کنید.
cp backend/.env.example backend/.env
$EDITOR backend/.env

# مقادیر اجباری:
# - JWT_SECRET تصادفی با حداقل ۳۲ نویسه
# - ADMIN_EMAIL و ADMIN_PASSWORD اختصاصی (رمز حداقل ۱۲ نویسه)
# - MCP_WORKER_TOKEN تصادفی با حداقل ۳۲ نویسه و برابر Secret در Cloudflare Worker
# - دامنه‌های واقعی CORS_ORIGIN / FRONTEND_URL / PUBLIC_BASE_URL
# - ZARINPAL_MERCHANT_ID معتبر و ZARINPAL_SANDBOX=false برای پرداخت واقعی
# - کلیدهای Provider فقط در backend/.env یا Cloudflare Secrets Store؛ نه در Git یا گفتگو

docker compose config --quiet
docker compose up -d --build
```

- فرانت: `http://localhost:3000` (ایمیج Next.js standalone روی پورت ۳۰۰۰)
- بک‌اند: `http://localhost:3001` (Express روی پورت ۳۰۰۱)
- دیتابیس SQLite، پوشهٔ آپلود و فایل‌های خصوصی AI در volume‌های `backend_data` / `backend_uploads` می‌مانند (`AI_PRIVATE_DIR=/app/data/ai`).

> **مهم:** Next.js مقدار `rewrites()` را در زمان `build` داخل `routes-manifest.json` ثابت می‌کند.
> به همین دلیل `BACKEND_INTERNAL_URL` باید **هنگام build** مشخص باشد (در compose به‌صورت `build.args` پاس داده می‌شود).
> اگر آدرس بک‌اند عوض شد، باید دوباره build بگیرید.

### استقرار بدون Docker

```bash
# فرانت
NEXT_OUTPUT_STANDALONE=true bun run build
node .next/standalone/server.js

# بک‌اند
cd backend
bun install
bun run build        # tsc → dist/
bun run start        # node dist/src/index.js
```

## لایسنس

خصوصی — nimarahimloo
