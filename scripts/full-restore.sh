#!/usr/bin/env bash
# بازیابی آسان از بک‌آپ کامل یا نسخه سبک بله
#
# مثال‌ها:
#   ./scripts/full-restore.sh
#       → آخرین antic-full روی سرور
#   ./scripts/full-restore.sh /var/backups/antic/antic-full-....zip
#   ./scripts/full-restore.sh ~/antic-light-....zip
#       → فایلی که از بله دانلود کردی و روی سرور کپی کردی
#   ./scripts/full-restore.sh --yes /path/to.zip
#       → بدون سؤال تأیید
#
set -euo pipefail

ROOT="${ANTIC_ROOT:-/var/www/antic}"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic}"
STAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY="${BACKUP_DIR}/pre-restore-${STAMP}"
YES=0
ZIP=""

for arg in "$@"; do
  case "$arg" in
    -y|--yes) YES=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) ZIP="$arg" ;;
  esac
done

if [[ -z "$ZIP" ]]; then
  ZIP="$(ls -t "$BACKUP_DIR"/antic-full-*.zip 2>/dev/null | head -1 || true)"
fi

if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
  echo "فایل بک‌آپ پیدا نشد."
  echo
  echo "روی سرور:"
  ls -lt "$BACKUP_DIR"/antic-full-*.zip 2>/dev/null | head -5 || echo "  (full نیست)"
  ls -lt "$BACKUP_DIR"/antic-light-*.zip 2>/dev/null | head -5 || echo "  (light نیست)"
  echo
  echo "از بله: فایل light را دانلود کن، بعد:"
  echo "  scp antic-light-....zip root@SERVER:/var/backups/antic/"
  echo "  $0 /var/backups/antic/antic-light-....zip"
  exit 1
fi

BASE="$(basename "$ZIP")"
echo "========================================"
echo " بازیابی آنتیک"
echo " فایل: $ZIP"
echo " ریشه: $ROOT"
echo "========================================"

if [[ "$BASE" == antic-light-* ]]; then
  echo "نوع: نسخه سبک بله (دیتابیس + env + تنظیمات)"
  echo "توجه: uploads داخل این فایل نیست — عکس‌ها عوض نمی‌شوند."
elif [[ "$BASE" == antic-full-* ]]; then
  echo "نوع: بک‌آپ کامل (db + uploads + env + nginx + pm2)"
else
  echo "نوع: ناشناخته — هرچه داخل zip باشد بازیابی می‌شود"
fi
echo

if [[ "$YES" -ne 1 ]]; then
  read -r -p "ادامه بدهم؟ [y/N] " ans
  [[ "${ans:-}" == "y" || "${ans:-}" == "Y" ]] || { echo "لغو شد"; exit 0; }
fi

mkdir -p "$SAFETY/db" "$SAFETY/uploads" "$SAFETY/env" "$BACKUP_DIR"

echo "==> توقف API"
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop antic-api 2>/dev/null || true
fi
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

echo "==> کپی ایمنی وضعیت فعلی → $SAFETY"
[[ -f "$ROOT/backend/prisma/dev.db" ]] && cp -a "$ROOT/backend/prisma/dev.db" "$SAFETY/db/" || true
[[ -f "$ROOT/backend/.env" ]] && cp -a "$ROOT/backend/.env" "$SAFETY/env/" || true
if [[ -d "$ROOT/backend/uploads" ]]; then
  rsync -a "$ROOT/backend/uploads/" "$SAFETY/uploads/" 2>/dev/null || true
fi

WORKDIR="$(mktemp -d /tmp/antic-restore-XXXXXX)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "==> باز کردن zip"
if ! command -v unzip >/dev/null 2>&1; then
  echo "ERROR: unzip نصب نیست → apt install -y unzip"
  exit 1
fi
unzip -q "$ZIP" -d "$WORKDIR"

SRC="$(find "$WORKDIR" -maxdepth 2 -type d \( -name 'antic-full-*' -o -name 'antic-light-*' -o -name 'antic-backup-*' \) | head -1 || true)"
if [[ -z "$SRC" ]]; then
  # شاید محتویات مستقیم db/ env/ باشد
  if [[ -d "$WORKDIR/db" || -f "$WORKDIR/db/dev.db" ]]; then
    SRC="$WORKDIR"
  else
    SRC="$(find "$WORKDIR" -type d -name 'db' -printf '%h\n' | head -1 || true)"
  fi
fi
if [[ -z "$SRC" ]]; then
  echo "ERROR: ساختار بک‌آپ شناخته نشد"
  find "$WORKDIR" -maxdepth 3 -type d | head -30
  exit 1
fi
echo "    منبع داخل zip: $SRC"

RESTORED_DB=0
RESTORED_UPLOADS=0
RESTORED_ENV=0

echo "==> دیتابیس"
mkdir -p "$ROOT/backend/prisma"
if [[ -f "$SRC/db/dev.db" ]]; then
  rm -f "$ROOT/backend/prisma/dev.db-wal" "$ROOT/backend/prisma/dev.db-shm" "$ROOT/backend/prisma/dev.db-journal" || true
  cp -a "$SRC/db/dev.db" "$ROOT/backend/prisma/dev.db"
  for ext in -wal -shm -journal; do
    [[ -f "$SRC/db/dev.db${ext}" ]] && cp -a "$SRC/db/dev.db${ext}" "$ROOT/backend/prisma/" || true
  done
  RESTORED_DB=1
  echo "    OK dev.db"
else
  echo "    رد شد (در این zip دیتابیس نبود)"
fi

echo "==> uploads"
if [[ -d "$SRC/uploads" ]] && [[ -n "$(ls -A "$SRC/uploads" 2>/dev/null || true)" ]]; then
  mkdir -p "$ROOT/backend/uploads"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$SRC/uploads/" "$ROOT/backend/uploads/"
  else
    rm -rf "$ROOT/backend/uploads"
    mkdir -p "$ROOT/backend/uploads"
    cp -a "$SRC/uploads/." "$ROOT/backend/uploads/"
  fi
  RESTORED_UPLOADS=1
  echo "    OK uploads"
else
  echo "    رد شد (نسخه بله معمولاً uploads ندارد — عکس‌های فعلی سرور دست نخورده ماند)"
fi

echo "==> env"
if [[ -f "$SRC/env/backend.env" ]]; then
  cp -a "$SRC/env/backend.env" "$ROOT/backend/.env"
  chmod 600 "$ROOT/backend/.env" || true
  RESTORED_ENV=1
  echo "    OK backend.env"
else
  echo "    رد شد"
fi

# nginx / cron اختیاری — فقط کپی گزارش، اعمال خودکار خطرناک است
if [[ -d "$SRC/nginx" ]]; then
  echo "==> nginx در بک‌آپ هست → برای احتیاط فقط در $SAFETY/nginx کپی شد"
  mkdir -p "$SAFETY/nginx"
  cp -a "$SRC/nginx/." "$SAFETY/nginx/" 2>/dev/null || true
fi
if [[ -f "$SRC/cron/root.crontab" ]]; then
  mkdir -p "$SAFETY/cron"
  cp -a "$SRC/cron/root.crontab" "$SAFETY/cron/" 2>/dev/null || true
  echo "==> crontab بک‌آپ در $SAFETY/cron (دستی: crontab $SAFETY/cron/root.crontab)"
fi

echo "==> Prisma + وابستگی"
cd "$ROOT/backend"
npm install --no-audit --no-fund >/dev/null 2>&1 || true
npx prisma generate
npx prisma db push >/dev/null 2>&1 || true

echo "==> روشن کردن API"
if [[ -f "$ROOT/backend/ecosystem.config.cjs" ]]; then
  pm2 delete antic-api 2>/dev/null || true
  pm2 start "$ROOT/backend/ecosystem.config.cjs"
  pm2 save >/dev/null 2>&1 || true
else
  pm2 restart antic-api 2>/dev/null || true
fi

sleep 2
HEALTH="$(curl -sf http://127.0.0.1:3001/api/health || true)"
echo
echo "========================================"
echo " نتیجه"
echo "  دیتابیس:  $([ $RESTORED_DB -eq 1 ] && echo بله || echo خیر)"
echo "  uploads:  $([ $RESTORED_UPLOADS -eq 1 ] && echo بله || echo خیر)"
echo "  env:      $([ $RESTORED_ENV -eq 1 ] && echo بله || echo خیر)"
echo "  health:   ${HEALTH:-ناموفق}"
echo "  ایمنی:    $SAFETY"
echo "========================================"
if [[ $RESTORED_DB -eq 1 && -n "$HEALTH" ]]; then
  echo "بازیابی موفق."
else
  echo "بخشی انجام شد یا health خطا داد — pm2 logs antic-api را ببین."
fi
