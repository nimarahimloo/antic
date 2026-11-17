#!/usr/bin/env bash
# بک‌آپ کامل قابل‌بازیابی پرده آنتیک
# - همیشه روی دیسک: /var/backups/antic/full-...
# - نسخه سبک (db+env+meta) به بله (اگر تنظیم شده باشد)
set -euo pipefail

ROOT="${ANTIC_ROOT:-/var/www/antic}"
ENV_FILE="${ANTIC_BACKUP_ENV:-/etc/antic-backup.env}"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic}"
export TZ="${ANTIC_BACKUP_TZ:-Asia/Tehran}"
STAMP="$(date +%Y%m%d-%H%M%S)"
HUMAN="$(date '+%Y/%m/%d %H:%M:%S')"
NAME="antic-full-${STAMP}"
WORK="${BACKUP_DIR}/${NAME}"
FULL_ZIP="${BACKUP_DIR}/${NAME}.zip"
LIGHT_ZIP="${BACKUP_DIR}/antic-light-${STAMP}.zip"
LOG="${BACKUP_DIR}/full-backup.log"
KEEP_DAYS="${ANTIC_BACKUP_KEEP_DAYS:-14}"
BALE_API_BASE="${BALE_API_BASE:-https://tapi.bale.ai}"
MAX_SEND_BYTES=$((48 * 1024 * 1024))

mkdir -p "$BACKUP_DIR"
exec >>"$LOG" 2>&1
echo "==== ${HUMAN} FULL BACKUP START ===="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

BOT_TOKEN="${BALE_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}"
CHAT_ID="${BALE_CHAT_ID:-${TELEGRAM_CHAT_ID:-}}"

rm -rf "$WORK"
mkdir -p \
  "$WORK/db" \
  "$WORK/env" \
  "$WORK/uploads" \
  "$WORK/nginx" \
  "$WORK/pm2" \
  "$WORK/cron" \
  "$WORK/meta" \
  "$WORK/backend-config"

# --- 1) دیتابیس ---
if [[ -f "$ROOT/backend/prisma/dev.db" ]]; then
  # snapshot امن‌تر با sqlite3 اگر موجود باشد
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$ROOT/backend/prisma/dev.db" ".backup '$WORK/db/dev.db'" || cp -a "$ROOT/backend/prisma/dev.db" "$WORK/db/dev.db"
  else
    cp -a "$ROOT/backend/prisma/dev.db" "$WORK/db/dev.db"
  fi
fi
for ext in -journal -wal -shm; do
  f="$ROOT/backend/prisma/dev.db${ext}"
  [[ -f "$f" ]] && cp -a "$f" "$WORK/db/" || true
done

# --- 2) env / اسرار ---
[[ -f "$ROOT/backend/.env" ]] && cp -a "$ROOT/backend/.env" "$WORK/env/backend.env" || true
[[ -f "$ROOT/.env" ]] && cp -a "$ROOT/.env" "$WORK/env/root.env" || true
[[ -f /etc/antic-backup.env ]] && cp -a /etc/antic-backup.env "$WORK/env/antic-backup.env" || true

# --- 3) uploads (حیاتی برای عکس‌ها) ---
if [[ -d "$ROOT/backend/uploads" ]]; then
  rsync -a --delete "$ROOT/backend/uploads/" "$WORK/uploads/" 2>/dev/null \
    || cp -a "$ROOT/backend/uploads/." "$WORK/uploads/" 2>/dev/null \
    || true
fi

# --- 4) nginx ---
for conf in /etc/nginx/sites-enabled/antic /etc/nginx/sites-available/antic \
            /etc/nginx/conf.d/antic.conf /etc/nginx/sites-enabled/default; do
  [[ -f "$conf" ]] && cp -a "$conf" "$WORK/nginx/$(basename "$conf")" || true
done
[[ -d /etc/nginx/sites-enabled ]] && cp -a /etc/nginx/sites-enabled "$WORK/nginx/sites-enabled" 2>/dev/null || true

# --- 5) PM2 ---
if command -v pm2 >/dev/null 2>&1; then
  pm2 save 2>/dev/null || true
  [[ -f /root/.pm2/dump.pm2 ]] && cp -a /root/.pm2/dump.pm2 "$WORK/pm2/dump.pm2" || true
  pm2 prettylist >"$WORK/pm2/prettylist.txt" 2>/dev/null || true
fi
[[ -f "$ROOT/backend/ecosystem.config.cjs" ]] && cp -a "$ROOT/backend/ecosystem.config.cjs" "$WORK/pm2/" || true

# --- 6) cron ---
crontab -l >"$WORK/cron/root.crontab" 2>/dev/null || echo "# empty" >"$WORK/cron/root.crontab"

# --- 7) meta / نسخه کد ---
(
  cd "$ROOT"
  {
    echo "created_at=${HUMAN} Asia/Tehran"
    echo "hostname=$(hostname)"
    echo "git_head=$(git rev-parse HEAD 2>/dev/null || echo none)"
    echo "git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo none)"
    git status -sb 2>/dev/null || true
    echo "--- disk ---"
    df -h "$ROOT" /var/backups 2>/dev/null || true
    echo "--- node ---"
    node -v 2>/dev/null || true
    echo "--- pm2 ---"
    pm2 status 2>/dev/null || true
  } >"$WORK/meta/info.txt"
) || true

# package locks برای بازسازی دقیق وابستگی‌ها
[[ -f "$ROOT/package-lock.json" ]] && cp -a "$ROOT/package-lock.json" "$WORK/meta/" || true
[[ -f "$ROOT/backend/package-lock.json" ]] && cp -a "$ROOT/backend/package-lock.json" "$WORK/meta/backend-package-lock.json" || true
[[ -f "$ROOT/backend/prisma/schema.prisma" ]] && cp -a "$ROOT/backend/prisma/schema.prisma" "$WORK/backend-config/" || true

# --- zip کامل ---
if ! command -v zip >/dev/null 2>&1; then
  echo "ERROR: zip not installed (apt install -y zip)"
  exit 1
fi
(
  cd "$BACKUP_DIR"
  zip -qr "$FULL_ZIP" "$NAME"
)
FULL_SIZE=$(stat -c%s "$FULL_ZIP" 2>/dev/null || echo 0)
echo "full_zip=$FULL_ZIP size=$FULL_SIZE"

# --- zip سبک فقط برای بله (db + env + meta + nginx + pm2 + cron) ---
LIGHT_DIR="${BACKUP_DIR}/antic-light-${STAMP}"
rm -rf "$LIGHT_DIR"
mkdir -p "$LIGHT_DIR"
cp -a "$WORK/db" "$LIGHT_DIR/" 2>/dev/null || true
cp -a "$WORK/env" "$LIGHT_DIR/" 2>/dev/null || true
cp -a "$WORK/meta" "$LIGHT_DIR/" 2>/dev/null || true
cp -a "$WORK/nginx" "$LIGHT_DIR/" 2>/dev/null || true
cp -a "$WORK/pm2" "$LIGHT_DIR/" 2>/dev/null || true
cp -a "$WORK/cron" "$LIGHT_DIR/" 2>/dev/null || true
cp -a "$WORK/backend-config" "$LIGHT_DIR/" 2>/dev/null || true
echo "full_backup_on_server=$FULL_ZIP" >"$LIGHT_DIR/RESTORE_NOTE.txt"
echo "uploads are inside the FULL zip on server only" >>"$LIGHT_DIR/RESTORE_NOTE.txt"
(
  cd "$BACKUP_DIR"
  zip -qr "$LIGHT_ZIP" "antic-light-${STAMP}"
)
rm -rf "$LIGHT_DIR" "$WORK"

LIGHT_SIZE=$(stat -c%s "$LIGHT_ZIP" 2>/dev/null || echo 0)
echo "light_zip=$LIGHT_ZIP size=$LIGHT_SIZE"

send_msg() {
  [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]] && return 0
  curl -fsS -X POST "${BALE_API_BASE}/bot${BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${CHAT_ID}" \
    --data-urlencode "text=$1" >/dev/null || echo "WARN: sendMessage failed"
}

MSG="بک‌آپ کامل آنتیک
تاریخ: ${HUMAN} (تهران)
کامل روی سرور: ${FULL_ZIP}
حجم کامل: $((FULL_SIZE / 1024 / 1024)) MB
سبک: $((LIGHT_SIZE / 1024)) KB"

if [[ -n "$BOT_TOKEN" && -n "$CHAT_ID" ]]; then
  if (( LIGHT_SIZE > 0 && LIGHT_SIZE <= MAX_SEND_BYTES )); then
    if curl -fsS -X POST "${BALE_API_BASE}/bot${BOT_TOKEN}/sendDocument" \
      -F "chat_id=${CHAT_ID}" \
      -F "document=@${LIGHT_ZIP}" \
      -F "caption=${MSG}" >/dev/null; then
      echo "bale: light document sent"
      send_msg "✅ بک‌آپ کامل انجام شد
${MSG}

برای restore کامل به zip روی سرور نیاز است (شامل uploads)."
    else
      send_msg "⚠️ بک‌آپ روی سرور ساخته شد ولی ارسال بله ناموفق بود
${MSG}"
    fi
  else
    send_msg "✅ بک‌آپ کامل روی سرور
${MSG}"
  fi
fi

# نگهداری
find "$BACKUP_DIR" -name 'antic-full-*.zip' -type f -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name 'antic-light-*.zip' -type f -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
echo "==== ${HUMAN} FULL BACKUP DONE ===="
