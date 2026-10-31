#!/usr/bin/env bash
# یک بک‌آپ واحد آنتیک
# - روی سرور: /var/backups/antic/latest.zip  (+ آرشیو تاریخ‌دار)
# - به بله: همان فایل (اگر از ۵۰MB کوچکتر باشد؛ وگرنه فقط db+env)
# - شناسه فایل بله ذخیره می‌شود تا restore از سرور بدون لپ‌تاپ ممکن باشد
set -euo pipefail

ROOT="${ANTIC_ROOT:-/var/www/antic}"
ENV_FILE="${ANTIC_BACKUP_ENV:-/etc/antic-backup.env}"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic}"
export TZ="${ANTIC_BACKUP_TZ:-Asia/Tehran}"
STAMP="$(date +%Y%m%d-%H%M%S)"
HUMAN="$(date '+%Y/%m/%d %H:%M:%S')"
WORK="${BACKUP_DIR}/work-${STAMP}"
ARCHIVE="${BACKUP_DIR}/antic-${STAMP}.zip"
LATEST="${BACKUP_DIR}/latest.zip"
LAST_META="${BACKUP_DIR}/last-bale.json"
LOG="${BACKUP_DIR}/backup.log"
KEEP_DAYS="${ANTIC_BACKUP_KEEP_DAYS:-14}"
BALE_API_BASE="${BALE_API_BASE:-https://tapi.bale.ai}"
MAX_SEND=$((48 * 1024 * 1024))

mkdir -p "$BACKUP_DIR"
exec >>"$LOG" 2>&1
echo "==== ${HUMAN} backup start ===="

[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
BOT_TOKEN="${BALE_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}"
CHAT_ID="${BALE_CHAT_ID:-${TELEGRAM_CHAT_ID:-}}"

command -v zip >/dev/null || { echo "ERROR: apt install -y zip"; exit 1; }

rm -rf "$WORK"
mkdir -p "$WORK/db" "$WORK/env" "$WORK/uploads" "$WORK/meta" "$WORK/pm2" "$WORK/cron"

# دیتابیس
if [[ -f "$ROOT/backend/prisma/dev.db" ]]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$ROOT/backend/prisma/dev.db" ".backup '$WORK/db/dev.db'" 2>/dev/null \
      || cp -a "$ROOT/backend/prisma/dev.db" "$WORK/db/dev.db"
  else
    cp -a "$ROOT/backend/prisma/dev.db" "$WORK/db/dev.db"
  fi
fi

# env
[[ -f "$ROOT/backend/.env" ]] && cp -a "$ROOT/backend/.env" "$WORK/env/backend.env" || true

# uploads (همیشه داخل بک‌آپ سرور)
if [[ -d "$ROOT/backend/uploads" ]]; then
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "$ROOT/backend/uploads/" "$WORK/uploads/" 2>/dev/null || true
  else
    cp -a "$ROOT/backend/uploads/." "$WORK/uploads/" 2>/dev/null || true
  fi
fi

# pm2 / cron / meta
command -v pm2 >/dev/null && pm2 save >/dev/null 2>&1 || true
[[ -f /root/.pm2/dump.pm2 ]] && cp -a /root/.pm2/dump.pm2 "$WORK/pm2/" || true
[[ -f "$ROOT/backend/ecosystem.config.cjs" ]] && cp -a "$ROOT/backend/ecosystem.config.cjs" "$WORK/pm2/" || true
crontab -l >"$WORK/cron/root.crontab" 2>/dev/null || true
{
  echo "created=${HUMAN} Tehran"
  echo "host=$(hostname)"
  (cd "$ROOT" && git rev-parse HEAD 2>/dev/null || true)
} >"$WORK/meta/info.txt"

(
  cd "$BACKUP_DIR"
  zip -qr "$ARCHIVE" "work-${STAMP}"
)
# ساختار داخلی را به antic/ یکدست کنیم برای restore
# zip شامل work-STAMP است — restore هر دو را می‌فهمد
cp -f "$ARCHIVE" "$LATEST"
SIZE=$(stat -c%s "$ARCHIVE")
echo "archive=$ARCHIVE size=$SIZE"

# اگر خیلی بزرگ است، نسخه بله = فقط db+env
SEND_FILE="$ARCHIVE"
if (( SIZE > MAX_SEND )); then
  LIGHT_WORK="${BACKUP_DIR}/light-${STAMP}"
  LIGHT_ZIP="${BACKUP_DIR}/antic-bale-${STAMP}.zip"
  rm -rf "$LIGHT_WORK"
  mkdir -p "$LIGHT_WORK/db" "$LIGHT_WORK/env" "$LIGHT_WORK/meta"
  cp -a "$WORK/db/." "$LIGHT_WORK/db/" 2>/dev/null || true
  cp -a "$WORK/env/." "$LIGHT_WORK/env/" 2>/dev/null || true
  cp -a "$WORK/meta/." "$LIGHT_WORK/meta/" 2>/dev/null || true
  echo "full_on_server=$ARCHIVE" >"$LIGHT_WORK/meta/note.txt"
  (
    cd "$BACKUP_DIR"
    zip -qr "$LIGHT_ZIP" "light-${STAMP}"
  )
  SEND_FILE="$LIGHT_ZIP"
  echo "bale_send=light size=$(stat -c%s "$LIGHT_ZIP")"
fi

rm -rf "$WORK"

send_msg() {
  [[ -z "${BOT_TOKEN:-}" || -z "${CHAT_ID:-}" ]] && return 0
  curl -fsS -X POST "${BALE_API_BASE}/bot${BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${CHAT_ID}" \
    --data-urlencode "text=$1" >/dev/null || true
}

if [[ -n "${BOT_TOKEN:-}" && -n "${CHAT_ID:-}" ]]; then
  RESP=$(curl -sS -X POST "${BALE_API_BASE}/bot${BOT_TOKEN}/sendDocument" \
    -F "chat_id=${CHAT_ID}" \
    -F "document=@${SEND_FILE}" \
    -F "caption=بک‌آپ آنتیک
${HUMAN} (تهران)
حجم ارسالی: $(( $(stat -c%s "$SEND_FILE") / 1024 )) KB
کامل روی سرور: ${ARCHIVE}" 2>/dev/null || true)
  echo "bale_response=${RESP:0:300}"
  # ذخیره file_id برای restore از بله
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$RESP" "$LAST_META" "$ARCHIVE" "$SEND_FILE" "$HUMAN" <<'PY'
import json,sys
raw, meta_path, full, sent, human = sys.argv[1:6]
try:
    data=json.loads(raw)
except Exception:
    data={}
ok=bool(data.get("ok"))
file_id=""
try:
    file_id=data["result"]["document"]["file_id"]
except Exception:
    try:
        file_id=data["result"]["document"]["file_unique_id"]
    except Exception:
        file_id=""
out={
    "ok": ok,
    "file_id": file_id,
    "full_zip": full,
    "sent_zip": sent,
    "when": human,
    "raw_ok": ok,
}
open(meta_path,"w",encoding="utf-8").write(json.dumps(out,ensure_ascii=False,indent=2))
print("saved_meta", meta_path, "file_id", file_id[:20] if file_id else "-")
PY
  fi
  if echo "$RESP" | grep -q '"ok":true'; then
    echo "bale: sent"
    send_msg "✅ بک‌آپ آنتیک ثبت شد
زمان: ${HUMAN} (تهران)
برای بازیابی روی سرور:
/var/www/antic/scripts/antic-restore.sh"
  else
    echo "bale: send failed"
    send_msg "⚠️ بک‌آپ روی سرور ساخته شد ولی ارسال بله ناموفق بود
${ARCHIVE}"
  fi
else
  echo "bale: skipped (no token)"
fi

find "$BACKUP_DIR" -name 'antic-*.zip' -type f -mtime +"$KEEP_DAYS" ! -name 'latest.zip' -delete 2>/dev/null || true
find "$BACKUP_DIR" -name 'antic-bale-*.zip' -type f -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
echo "==== ${HUMAN} backup done ===="
