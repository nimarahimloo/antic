#!/usr/bin/env bash
# بک‌آپ روزانه پرده آنتیک → zip → تلگرام
# نیاز: TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID در /etc/antic-backup.env
set -euo pipefail

ROOT="${ANTIC_ROOT:-/var/www/antic}"
ENV_FILE="${ANTIC_BACKUP_ENV:-/etc/antic-backup.env}"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic}"
STAMP="$(date +%Y%m%d-%H%M%S)"
NAME="antic-backup-${STAMP}"
WORK="${BACKUP_DIR}/${NAME}"
ZIP="${BACKUP_DIR}/${NAME}.zip"
LOG="${BACKUP_DIR}/backup.log"
MAX_TG_BYTES=$((48 * 1024 * 1024))  # زیر امن زیر سقف ۵۰MB تلگرام
KEEP_DAYS="${ANTIC_BACKUP_KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"
exec >>"$LOG" 2>&1
echo "==== $(date -Is) start ===="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing in $ENV_FILE"
  exit 1
fi

rm -rf "$WORK"
mkdir -p "$WORK/db" "$WORK/env" "$WORK/meta"

# دیتابیس
if [[ -f "$ROOT/backend/prisma/dev.db" ]]; then
  cp -a "$ROOT/backend/prisma/dev.db" "$WORK/db/dev.db"
elif [[ -f "$ROOT/backend/dev.db" ]]; then
  cp -a "$ROOT/backend/dev.db" "$WORK/db/dev.db"
fi
# journal/wal اگر هست
for ext in -journal -wal -shm; do
  f="$ROOT/backend/prisma/dev.db${ext}"
  [[ -f "$f" ]] && cp -a "$f" "$WORK/db/" || true
done

# env (رمزها داخل بک‌آپ می‌روند — فایل را محرمانه نگه دارید)
if [[ -f "$ROOT/backend/.env" ]]; then
  cp -a "$ROOT/backend/.env" "$WORK/env/backend.env"
fi
if [[ -f "$ROOT/.env" ]]; then
  cp -a "$ROOT/.env" "$WORK/env/root.env"
fi

# نسخه git
(
  cd "$ROOT"
  git rev-parse HEAD 2>/dev/null || echo "no-git"
  git status -sb 2>/dev/null || true
) >"$WORK/meta/git.txt" || true

hostname >"$WORK/meta/hostname.txt"
date -Is >"$WORK/meta/created_at.txt"
df -h "$ROOT" >"$WORK/meta/disk.txt" 2>/dev/null || true

# لیست uploads (نه خود فایل‌ها — حجم زیاد است)
if [[ -d "$ROOT/backend/uploads" ]]; then
  ls -lah "$ROOT/backend/uploads" >"$WORK/meta/uploads-listing.txt" 2>/dev/null || true
  du -sh "$ROOT/backend/uploads" >"$WORK/meta/uploads-size.txt" 2>/dev/null || true
fi

# در صورت نیاز می‌توانید با ANTIC_BACKUP_INCLUDE_UPLOADS=1 کل uploads را هم بگذارید (معمولاً >50MB)
if [[ "${ANTIC_BACKUP_INCLUDE_UPLOADS:-0}" == "1" ]] && [[ -d "$ROOT/backend/uploads" ]]; then
  mkdir -p "$WORK/uploads"
  # فقط فایل‌های کوچک‌تر از ۱۰MB تا zip خیلی بزرگ نشود
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

send_msg() {
  local text="$1"
  curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" \
    -d "disable_web_page_preview=true" >/dev/null || true
}

if (( SIZE > 0 && SIZE <= MAX_TG_BYTES )); then
  curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" \
    -F "chat_id=${TELEGRAM_CHAT_ID}" \
    -F "document=@${ZIP}" \
    -F "caption=بک‌آپ آنتیک ${STAMP}\nحجم: $((SIZE / 1024)) KB" \
    >/dev/null
  echo "telegram: document sent"
else
  send_msg "بک‌آپ آنتیک ${STAMP}\nحجم zip بیش از سقف تلگرام است ($((SIZE / 1024 / 1024)) MB).\nمسیر روی سرور:\n${ZIP}"
  echo "telegram: size notice sent"
fi

# پاک‌سازی بک‌آپ‌های قدیمی
find "$BACKUP_DIR" -name 'antic-backup-*.zip' -type f -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
echo "==== $(date -Is) done ===="
