#!/usr/bin/env bash
# ---------------------------------------------------------------
# ساخت بستهٔ انتشار (release bundle) بدون نیاز به git روی سرور
#
#   ./scripts/build-release.sh [output-dir]
#
# خروجی: antic-release-<timestamp>.tar.gz
# شامل: فرانت standalone + بک‌اند کامپایل‌شده + اسکیما + اسکریپت راه‌اندازی
# ---------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT_DIR="${1:-$ROOT/release}"
STAMP="$(date +%Y%m%d-%H%M%S)"
NAME="antic-release-${STAMP}"
WORK="$OUT_DIR/$NAME"

echo "==> پاک‌سازی"
rm -rf "$WORK"
mkdir -p "$WORK"

echo "==> build فرانت (Next.js standalone)"
rm -rf .next
NEXT_OUTPUT_STANDALONE=true NEXT_TELEMETRY_DISABLED=1 npm run build

mkdir -p "$WORK/web"
cp -r .next/standalone/. "$WORK/web/"
mkdir -p "$WORK/web/.next"
cp -r .next/static "$WORK/web/.next/static"
cp -r public "$WORK/web/public"

echo "==> build بک‌اند (tsc → dist)"
cd "$ROOT/backend"
npm ci --no-audit --no-fund
npx prisma generate
rm -rf dist && npm run build

cd "$ROOT"
mkdir -p "$WORK/api"
cp -r backend/dist "$WORK/api/dist"
mkdir -p "$WORK/api/prisma"
cp backend/prisma/schema.prisma "$WORK/api/prisma/"
cp backend/prisma/seed.ts "$WORK/api/prisma/"
cp -r backend/package.json backend/package-lock.json "$WORK/api/"
cp -r backend/node_modules "$WORK/api/node_modules"
# دیتابیس هرگز نباید داخل بستهٔ انتشار برود
mkdir -p "$WORK/api/uploads"

echo "==> متادیتا"
cat > "$WORK/deploy.sh" <<'EOS'
#!/usr/bin/env bash
# روی سرور اجرا می‌شود:
#   tar -xzf antic-release-*.tar.gz -C /var/www/antic-release
#   cd /var/www/antic-release && ./deploy.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TARGET="${ANTIC_ROOT:-/var/www/antic}"

echo "==> کپی به $TARGET"
mkdir -p "$TARGET"
rsync -a --delete "$HERE/web/" "$TARGET/web/"
rsync -a --delete "$HERE/api/dist/" "$TARGET/backend/dist/"
cp "$HERE/api/prisma/schema.prisma" "$TARGET/backend/prisma/schema.prisma"
cp "$HERE/api/prisma/seed.ts" "$TARGET/backend/prisma/seed.ts"
cp "$HERE/api/package.json" "$HERE/api/package-lock.json" "$TARGET/backend/"
rsync -a "$HERE/api/node_modules/" "$TARGET/backend/node_modules/"
mkdir -p "$TARGET/backend/uploads"

echo "==> اسکیمای دیتابیس"
cd "$TARGET/backend"
# مسیر نسبی SQLite نسبت به فایل schema حساب می‌شود:
#   file:./dev.db  ->  $TARGET/backend/prisma/dev.db
DATABASE_URL="${DATABASE_URL:-file:./dev.db}" npx prisma db push --skip-generate

echo "==> nginx"
if [ -f "$HERE/nginx/antic.conf" ]; then
  cp /etc/nginx/sites-available/antic "$HERE/nginx/antic.conf.bak" 2>/dev/null || true
  cp "$HERE/nginx/antic.conf" /etc/nginx/sites-available/antic
  ln -sf /etc/nginx/sites-available/antic /etc/nginx/sites-enabled/antic
  nginx -t && systemctl reload nginx && echo "    nginx reload OK" || echo "    !! nginx reload failed — دستی بررسی کنید"
fi

echo "==> ری‌استارت pm2"
command -v pm2 >/dev/null 2>&1 && {
  pm2 restart antic-api --update-env || pm2 start "$TARGET/backend/ecosystem.config.cjs"
  pm2 restart antic-web --update-env || pm2 start "$TARGET/ecosystem.config.cjs"
  pm2 save >/dev/null 2>&1 || true
} || echo "!! pm2 نصب نیست — سرویس‌ها را دستی بالا بیاورید"

echo "==> health"
sleep 2
curl -sf http://127.0.0.1:3001/api/health && echo || echo "(بک‌اند هنوز بالا نیست)"
curl -sf -o /dev/null http://127.0.0.1:3000/ && echo "فرانت OK" || echo "(فرانت هنوز بالا نیست)"
EOS
chmod +x "$WORK/deploy.sh"

mkdir -p "$WORK/nginx"
cp deploy/nginx/antic.conf "$WORK/nginx/antic.conf"

echo "==> فشرده‌سازی"
cd "$OUT_DIR"
tar -czf "${NAME}.tar.gz" "$NAME"
rm -rf "$WORK"
ls -lh "${NAME}.tar.gz"
echo "==> آماده: $OUT_DIR/${NAME}.tar.gz"
