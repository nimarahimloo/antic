#!/usr/bin/env bash
# دیپلوی پرده آنتیک روی سرور (Next.js + Express)
#   ./scripts/deploy.sh [branch]
#
# نکته‌ها:
#   - دیتابیس production دست‌نخورده می‌ماند (فقط backup + prisma db push)
#   - قبل از هر تغییر، backup از db/nginx/pm2 گرفته می‌شود
#   - اگر nginx -t fail شود، کانفیگ قبلی برگردانده می‌شود
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BRANCH="${1:-dev}"

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic-deploy}"
mkdir -p "$BACKUP_DIR"

export PATH="$PATH:/root/.nvm/versions/node/v22.23.4/bin:/root/.nvm/versions/node/v22.22.1/bin"

echo "==> وضعیت git"
git status -sb || true

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "!! فایل‌های track‌شده تغییر دارند — نادیده گرفته می‌شوند (env/db دست نمی‌خورد)"
fi

echo "==> backup ($STAMP)"
if [[ -f "$ROOT/backend/prisma/dev.db" ]]; then
  cp -a "$ROOT/backend/prisma/dev.db" "$BACKUP_DIR/dev.db.$STAMP"
  echo "    db: $BACKUP_DIR/dev.db.$STAMP"
fi
for f in /etc/nginx/nginx.conf /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default; do
  [[ -f "$f" ]] && cp -a "$f" "$BACKUP_DIR/$(echo "$f" | tr '/' '_').$STAMP"
done
pm2 save >/dev/null 2>&1 || true
[[ -f /root/.pm2/dump.pm2 ]] && cp -a /root/.pm2/dump.pm2 "$BACKUP_DIR/dump.pm2.$STAMP"
echo "    backup: $BACKUP_DIR"

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
# اپ‌های نسخه‌ی قدیمی (Vite) پورت‌های 3000/3001 را اشغال می‌کنند
for old in antic-backend antic-frontend; do
  if pm2 describe "$old" >/dev/null 2>&1; then
    echo "    حذف اپ قدیمی: $old"
    pm2 delete "$old" >/dev/null 2>&1 || true
  fi
done

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
  # map مربوط به WebSocket باید در context سطح http باشد
  if ! grep -q 'connection_upgrade' /etc/nginx/nginx.conf; then
    cp -a /etc/nginx/nginx.conf "$BACKUP_DIR/nginx.conf.pre-map.$STAMP"
    python3 - <<'PY'
import re
p = "/etc/nginx/nginx.conf"
s = open(p, encoding="utf-8").read()
m = re.search(r"(?m)^\s*http\s*\{", s)
if m:
    block = "\n    map $http_upgrade $connection_upgrade {\n        default upgrade;\n        ''      close;\n    }\n"
    s = s[:m.end()] + block + s[m.end():]
    open(p, "w", encoding="utf-8").write(s)
    print("    map $http_upgrade اضافه شد")
else:
    print("    !! http block پیدا نشد")
PY
  fi

  # سایت قدیمی (Vite) نباید هم‌زمان فعال باشد
  if [ -e /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default
    echo "    سایت قدیمی default غیرفعال شد"
  fi

  cp /etc/nginx/sites-available/antic /etc/nginx/sites-available/antic.bak 2>/dev/null || true
  cp "$ROOT/deploy/nginx/antic.conf" /etc/nginx/sites-available/antic
  ln -sf /etc/nginx/sites-available/antic /etc/nginx/sites-enabled/antic
  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx && echo "    nginx reload OK"
  else
    echo "    !! nginx -t failed — کانفیگ قبلی برگردانده شد"
    cp /etc/nginx/sites-available/antic.bak /etc/nginx/sites-available/antic 2>/dev/null || true
    cp "$BACKUP_DIR/_etc_nginx_nginx.conf.$STAMP" /etc/nginx/nginx.conf 2>/dev/null || true
    nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
  fi
else
  echo "    (nginx یا فایل کانفیگ پیدا نشد — دستی بررسی کنید)"
fi

echo "==> health"
sleep 3
curl -sf http://127.0.0.1:3001/api/health && echo || echo "(بک‌اند هنوز بالا نیست)"
curl -sf -o /dev/null http://127.0.0.1:3000/ && echo "فرانت OK" || echo "(فرانت هنوز بالا نیست)"
echo "تمام."
