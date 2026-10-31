#!/usr/bin/env bash
# بک‌آپ روزانه پرده آنتیک → zip → ربات بله
# نیاز در /etc/antic-backup.env:
#   BALE_BOT_TOKEN=...
#   BALE_CHAT_ID=...
set -euo pipefail

ROOT="${ANTIC_ROOT:-/var/www/antic}"
ENV_FILE="${ANTIC_BACKUP_ENV:-/etc/antic-backup.env}"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic}"
# زمان تهران برای نمایش
export TZ="${ANTIC_BACKUP_TZ:-Asia/Tehran}"
STAMP="$(date +%Y%m%d-%H%M%S)"
HUMAN_DATE="$(date '+%Y/%m/%d')"
HUMAN_TIME="$(date '+%H:%M:%S')"
HUMAN_FULL="$(date '+%Y/%m/%d %H:%M:%S')"
NAME="antic-backup-${STAMP}"
WORK="${BACKUP_DIR}/${NAME}"
ZIP="${BACKUP_DIR}/${NAME}.zip"
LOG="${BACKUP_DIR}/backup.log"
MAX_SEND_BYTES=$((48 * 1024 * 1024))
KEEP_DAYS="${ANTIC_BACKUP_KEEP_DAYS:-7}"
BALE_API_BASE="${BALE_API_BASE:-https://tapi.bale.ai}"

mkdir -p "$BACKUP_DIR"
exec >>"$LOG" 2>&1
echo "==== $(date -Is) start ===="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

BOT_TOKEN="${BALE_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}"
CHAT_ID="${BALE_CHAT_ID:-${TELEGRAM_CHAT_ID:-}}"

if [[ -z "$BOT_TOKEN" || -z "$CHAT_ID" ]]; then
  echo "ERROR: BALE_BOT_TOKEN / BALE_CHAT_ID missing in $ENV_FILE"
  exit 1
fi

API_ROOT="${BALE_API_BASE}/bot${BOT_TOKEN}"

rm -rf "$WORK"
mkdir -p "$WORK/db" "$WORK/env" "$WORK/meta"

if [[ -f "$ROOT/backend/prisma/dev.db" ]]; then
  cp -a "$ROOT/backend/prisma/dev.db" "$WORK/db/dev.db"
elif [[ -f "$ROOT/backend/dev.db" ]]; then
  cp -a "$ROOT/backend/dev.db" "$WORK/db/dev.db"
fi
for ext in -journal -wal -shm; do
  f="$ROOT/backend/prisma/dev.db${ext}"
  [[ -f "$f" ]] && cp -a "$f" "$WORK/db/" || true
done

if [[ -f "$ROOT/backend/.env" ]]; then
  cp -a "$ROOT/backend/.env" "$WORK/env/backend.env"
fi
if [[ -f "$ROOT/.env" ]]; then
  cp -a "$ROOT/.env" "$WORK/env/root.env"
fi

(
  cd "$ROOT"
  git rev-parse HEAD 2>/dev/null || echo "no-git"
  git status -sb 2>/dev/null || true
) >"$WORK/meta/git.txt" || true

hostname >"$WORK/meta/hostname.txt"
echo "$HUMAN_FULL (Asia/Tehran)" >"$WORK/meta/created_at.txt"
df -h "$ROOT" >"$WORK/meta/disk.txt" 2>/dev/null || true

if [[ -d "$ROOT/backend/uploads" ]]; then
  ls -lah "$ROOT/backend/uploads" >"$WORK/meta/uploads-listing.txt" 2>/dev/null || true
  du -sh "$ROOT/backend/uploads" >"$WORK/meta/uploads-size.txt" 2>/dev/null || true
fi

if [[ "${ANTIC_BACKUP_INCLUDE_UPLOADS:-0}" == "1" ]] && [[ -d "$ROOT/backend/uploads" ]]; then
  mkdir -p "$WORK/uploads"
  find "$ROOT/backend/uploads" -type f -size -10M -print0 2>/dev/null \
    | tar --null -T - -cf - 2>/dev/null \
    | tar -C "$WORK/uploads" -xf - 2>/dev/null || true
fi

(
  cd "$BACKUP_DIR"
  zip -qr "$ZIP" "$NAME"
)
rm -rf "$WORK"

SIZE=$(stat -c%s "$ZIP" 2>/dev/null || echo 0)
echo "zip=$ZIP size=$SIZE"

CAPTION=$(cat <<EOF
بک‌آپ روزانه آنتیک
تاریخ: ${HUMAN_DATE}
ساعت: ${HUMAN_TIME} (تهران)
حجم: $((SIZE / 1024)) KB
فایل: ${NAME}.zip
EOF
)

send_msg() {
  local text="$1"
  curl -fsS -X POST "${API_ROOT}/sendMessage" \
    --data-urlencode "chat_id=${CHAT_ID}" \
    --data-urlencode "text=${text}" \
    >/dev/null || echo "WARN: sendMessage failed"
}

if (( SIZE > 0 && SIZE <= MAX_SEND_BYTES )); then
  if curl -fsS -X POST "${API_ROOT}/sendDocument" \
    -F "chat_id=${CHAT_ID}" \
    -F "document=@${ZIP}" \
    -F "caption=${CAPTION}" \
    >/dev/null; then
    echo "bale: document sent at ${HUMAN_FULL}"
    send_msg "✅ بک‌آپ موفق
تاریخ: ${HUMAN_DATE}
ساعت: ${HUMAN_TIME} (تهران)
حجم: $((SIZE / 1024)) KB"
  else
    echo "ERROR: sendDocument failed"
    send_msg "❌ بک‌آپ ساخته شد ولی ارسال فایل ناموفق بود
تاریخ: ${HUMAN_FULL}
${ZIP}
حجم: $((SIZE / 1024)) KB"
    exit 1
  fi
else
  send_msg "⚠️ بک‌آپ آنتیک ${HUMAN_FULL}
حجم zip بزرگ است ($((SIZE / 1024 / 1024)) MB).
مسیر روی سرور:
${ZIP}"
  echo "bale: size notice sent"
fi

find "$BACKUP_DIR" -name 'antic-backup-*.zip' -type f -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
echo "==== $(date -Is) done ===="
