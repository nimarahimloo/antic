#!/usr/bin/env bash
# دیپلوی پرده آنتیک روی سرور (Next.js + Express)
#   ./scripts/deploy.sh [branch]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BRANCH="${1:-dev}"

echo "==> وضعیت git"
git status -sb || true

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "!! فایل‌های track‌شده تغییر دارند — نادیده گرفته می‌شوند (env/db دست نمی‌خورد)"
fi

echo "==> pull ($BRANCH)"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> فرانت (Next.js)"
# Next.js مقدار rewrites() را در زمان build ثابت می‌کند، پس آدرس بک‌اند
# باید قبل از build مشخص باشد.
export BACKEND_INTERNAL_URL="${BACKEND_INTERNAL_URL:-http://127.0.0.1:3001}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://pardehantic.ir}"
export NEXT_TELEMETRY_DISABLED=1
npm ci --no-audit --no-fund
npm run build

echo "==> بک‌اند"
cd "$ROOT/backend"
npm ci --no-audit --no-fund
npx prisma generate
npx prisma db push --skip-generate
npm run build

cd "$ROOT"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "!! pm2 نصب نیست — سرویس‌ها را دستی بالا بیاورید:"
  echo "   cd $ROOT && npm start                 # فرانت (:3000)"
  echo "   cd $ROOT/backend && npm start         # بک‌اند (:3001)"
  exit 0
fi

echo "==> ری‌استارت سرویس‌ها"
# بک‌اند باید قبل از فرانت بالا بیاید تا /api پروکسی‌شده پاسخ بدهد
if pm2 describe antic-api >/dev/null 2>&1; then
  pm2 restart antic-api --update-env
else
  pm2 start "$ROOT/backend/ecosystem.config.cjs"
fi

if pm2 describe antic-web >/dev/null 2>&1; then
  pm2 restart antic-web --update-env
else
  pm2 start "$ROOT/ecosystem.config.cjs"
fi

pm2 save >/dev/null 2>&1 || true

echo "==> nginx"
if [ -f "$ROOT/deploy/nginx/antic.conf" ] && command -v nginx >/dev/null 2>&1; then
  cp /etc/nginx/sites-available/antic /etc/nginx/sites-available/antic.bak 2>/dev/null || true
  cp "$ROOT/deploy/nginx/antic.conf" /etc/nginx/sites-available/antic
  ln -sf /etc/nginx/sites-available/antic /etc/nginx/sites-enabled/antic
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx && echo "    nginx reload OK"
  else
    echo "    !! nginx -t failed — کانفیگ قبلی برگردانده شد"
    cp /etc/nginx/sites-available/antic.bak /etc/nginx/sites-available/antic 2>/dev/null || true
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
  fi
else
  echo "    (nginx یا فایل کانفیگ پیدا نشد — دستی بررسی کنید)"
fi

echo "==> health"
sleep 2
curl -sf http://127.0.0.1:3001/api/health && echo || echo "(بک‌اند هنوز بالا نیست)"
curl -sf -o /dev/null http://127.0.0.1:3000/ && echo "فرانت OK" || echo "(فرانت هنوز بالا نیست)"
echo "تمام."
