#!/usr/bin/env bash
# بازیابی امن از بک‌آپ کامل antic-full-YYYYMMDD-HHMMSS.zip
# استفاده:
#   ./scripts/full-restore.sh /var/backups/antic/antic-full-....zip
# قبل از اجرا سرویس را متوقف می‌کند؛ از دیتابیس فعلی هم بک‌آپ لحظه‌ای می‌گیرد.
set -euo pipefail

ROOT="${ANTIC_ROOT:-/var/www/antic}"
ZIP="${1:-}"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic}"
STAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY="${BACKUP_DIR}/pre-restore-${STAMP}"

if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
  echo "Usage: $0 /path/to/antic-full-YYYYMMDD-HHMMSS.zip"
  echo "Available:"
  ls -lt "$BACKUP_DIR"/antic-full-*.zip 2>/dev/null | head || true
  exit 1
fi

echo "==> Restore from: $ZIP"
echo "==> Project root: $ROOT"
read -r -p "ادامه؟ این کار دیتابیس و uploads را از بک‌آپ جایگزین می‌کند [y/N] " ans
[[ "${ans:-}" == "y" || "${ans:-}" == "Y" ]] || { echo "لغو شد"; exit 0; }

mkdir -p "$SAFETY" "$BACKUP_DIR"

# توقف API
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop antic-api 2>/dev/null || true
fi
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

# بک‌آپ ایمنی از وضعیت فعلی
echo "==> Safety copy → $SAFETY"
mkdir -p "$SAFETY/db" "$SAFETY/uploads" "$SAFETY/env"
[[ -f "$ROOT/backend/prisma/dev.db" ]] && cp -a "$ROOT/backend/prisma/dev.db" "$SAFETY/db/" || true
[[ -d "$ROOT/backend/uploads" ]] && rsync -a "$ROOT/backend/uploads/" "$SAFETY/uploads/" 2>/dev/null || true
[[ -f "$ROOT/backend/.env" ]] && cp -a "$ROOT/backend/.env" "$SAFETY/env/" || true

WORKDIR="$(mktemp -d /tmp/antic-restore-XXXXXX)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "==> Unzip"
unzip -q "$ZIP" -d "$WORKDIR"
# محتویات معمولاً یک پوشه antic-full-... است
SRC="$(find "$WORKDIR" -maxdepth 1 -type d -name 'antic-full-*' | head -1)"
if [[ -z "$SRC" ]]; then
  SRC="$WORKDIR"
fi

echo "==> Restore database"
mkdir -p "$ROOT/backend/prisma"
if [[ -f "$SRC/db/dev.db" ]]; then
  cp -a "$SRC/db/dev.db" "$ROOT/backend/prisma/dev.db"
  # پاک کردن wal/shm قدیمی تا sqlite قاطی نکند
  rm -f "$ROOT/backend/prisma/dev.db-wal" "$ROOT/backend/prisma/dev.db-shm" "$ROOT/backend/prisma/dev.db-journal" || true
  for ext in -wal -shm -journal; do
    [[ -f "$SRC/db/dev.db${ext}" ]] && cp -a "$SRC/db/dev.db${ext}" "$ROOT/backend/prisma/" || true
  done
else
  echo "WARN: no db/dev.db in backup"
fi

echo "==> Restore uploads"
if [[ -d "$SRC/uploads" ]]; then
  mkdir -p "$ROOT/backend/uploads"
  rsync -a --delete "$SRC/uploads/" "$ROOT/backend/uploads/" 2>/dev/null \
    || (rm -rf "$ROOT/backend/uploads"/* && cp -a "$SRC/uploads/." "$ROOT/backend/uploads/")
fi

echo "==> Restore env (فقط اگر در بک‌آپ باشد؛ بازنویسی می‌شود)"
if [[ -f "$SRC/env/backend.env" ]]; then
  cp -a "$SRC/env/backend.env" "$ROOT/backend/.env"
  chmod 600 "$ROOT/backend/.env" || true
fi

echo "==> Prisma generate"
cd "$ROOT/backend"
npm install --no-audit --no-fund 2>/dev/null || true
npx prisma generate
# db push بدون حذف داده — فقط همگام‌سازی اسکیما اگر لازم
# اگر اسکیما با دیتای بک‌آپ یکی است معمولاً no-op است
npx prisma db push 2>/dev/null || true

echo "==> PM2 restart"
if [[ -f "$ROOT/backend/ecosystem.config.cjs" ]]; then
  pm2 delete antic-api 2>/dev/null || true
  pm2 start "$ROOT/backend/ecosystem.config.cjs"
  pm2 save || true
else
  pm2 restart antic-api 2>/dev/null || pm2 start npm --name antic-api -- run start || true
fi

sleep 2
curl -sf http://127.0.0.1:3001/api/health && echo || echo "WARN: health check failed — لاگ pm2 را ببین"

echo "==> Done"
echo "Safety copy kept at: $SAFETY"
echo "اگر مشکلی بود می‌توانی از safety برگردانی."
