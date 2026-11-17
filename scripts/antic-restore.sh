#!/usr/bin/env bash
# بازیابی با یک دستور — بدون لپ‌تاپ
#
#   antic-restore.sh           → از آخرین بک‌آپ روی همین سرور
#   antic-restore.sh --bale    → دانلود از بله (آخرین فایلی که ربات فرستاده) و بازیابی
#   antic-restore.sh --yes     → بدون سؤال
#
set -euo pipefail

ROOT="${ANTIC_ROOT:-/var/www/antic}"
ENV_FILE="${ANTIC_BACKUP_ENV:-/etc/antic-backup.env}"
BACKUP_DIR="${ANTIC_BACKUP_DIR:-/var/backups/antic}"
LAST_META="${BACKUP_DIR}/last-bale.json"
LATEST="${BACKUP_DIR}/latest.zip"
BALE_API_BASE="${BALE_API_BASE:-https://tapi.bale.ai}"
STAMP="$(date +%Y%m%d-%H%M%S)"
SAFETY="${BACKUP_DIR}/pre-restore-${STAMP}"
FROM_BALE=0
YES=0
ZIP=""

for arg in "$@"; do
  case "$arg" in
    --bale|-b) FROM_BALE=1 ;;
    --yes|-y) YES=1 ;;
    --help|-h)
      echo "antic-restore.sh [--bale] [--yes]"
      exit 0
      ;;
    *) ZIP="$arg" ;;
  esac
done

[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
BOT_TOKEN="${BALE_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}"
CHAT_ID="${BALE_CHAT_ID:-${TELEGRAM_CHAT_ID:-}}"

if [[ "$FROM_BALE" -eq 1 ]]; then
  echo "==> دانلود بک‌آپ از بله"
  if [[ -z "${BOT_TOKEN:-}" ]]; then
    echo "ERROR: BALE_BOT_TOKEN در $ENV_FILE نیست"
    exit 1
  fi
  command -v python3 >/dev/null || { echo "python3 لازم است"; exit 1; }
  FILE_ID=""
  if [[ -f "$LAST_META" ]]; then
    FILE_ID=$(python3 -c "import json;print(json.load(open('$LAST_META')).get('file_id',''))" 2>/dev/null || true)
  fi
  # اگر file_id نبود از getUpdates آخرین document را بگیر
  if [[ -z "$FILE_ID" ]]; then
    UPD=$(curl -fsS "${BALE_API_BASE}/bot${BOT_TOKEN}/getUpdates?limit=50" || true)
    FILE_ID=$(python3 -c "
import json,sys
d=json.loads(sys.argv[1] or '{}')
fid=''
for u in reversed(d.get('result') or []):
    m=u.get('message') or {}
    doc=m.get('document') or {}
    if doc.get('file_id'):
        fid=doc['file_id']; break
print(fid)
" "$UPD" 2>/dev/null || true)
  fi
  if [[ -z "$FILE_ID" ]]; then
    echo "ERROR: file_id بله پیدا نشد. یک بار backup بزن تا متا ذخیره شود."
    exit 1
  fi
  echo "    file_id=$FILE_ID"
  GFILE=$(curl -fsS "${BALE_API_BASE}/bot${BOT_TOKEN}/getFile?file_id=${FILE_ID}" || true)
  FPATH=$(python3 -c "import json,sys;d=json.loads(sys.argv[1] or '{}');print((d.get('result') or {}).get('file_path',''))" "$GFILE" || true)
  if [[ -z "$FPATH" ]]; then
    echo "ERROR: getFile ناموفق: $GFILE"
    exit 1
  fi
  ZIP="${BACKUP_DIR}/from-bale-${STAMP}.zip"
  # بعضی پیاده‌سازی‌ها path کامل می‌دهند
  if [[ "$FPATH" == http* ]]; then
    curl -fsS -o "$ZIP" "$FPATH"
  else
    curl -fsS -o "$ZIP" "${BALE_API_BASE}/file/bot${BOT_TOKEN}/${FPATH}" \
      || curl -fsS -o "$ZIP" "${BALE_API_BASE}/bot${BOT_TOKEN}/file/${FPATH}" \
      || curl -fsS -o "$ZIP" "https://tapi.bale.ai/file/bot${BOT_TOKEN}/${FPATH}"
  fi
  echo "    دانلود شد: $ZIP ($(stat -c%s "$ZIP") bytes)"
elif [[ -z "$ZIP" ]]; then
  ZIP="$LATEST"
  if [[ ! -f "$ZIP" ]]; then
    ZIP=$(ls -t "$BACKUP_DIR"/antic-*.zip 2>/dev/null | head -1 || true)
  fi
fi

if [[ -z "$ZIP" || ! -f "$ZIP" ]]; then
  echo "بک‌آپی نیست. اول: /var/www/antic/scripts/antic-backup.sh"
  exit 1
fi

echo "========================================"
echo " بازیابی از: $ZIP"
echo "========================================"
if [[ "$YES" -ne 1 ]]; then
  read -r -p "ادامه؟ [y/N] " a
  [[ "${a:-}" == y || "${a:-}" == Y ]] || { echo "لغو"; exit 0; }
fi

command -v unzip >/dev/null || { echo "apt install -y unzip"; exit 1; }

mkdir -p "$SAFETY/db" "$SAFETY/env" "$SAFETY/uploads"
pm2 stop antic-api 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

[[ -f "$ROOT/backend/prisma/dev.db" ]] && cp -a "$ROOT/backend/prisma/dev.db" "$SAFETY/db/" || true
[[ -f "$ROOT/backend/.env" ]] && cp -a "$ROOT/backend/.env" "$SAFETY/env/" || true
[[ -d "$ROOT/backend/uploads" ]] && rsync -a "$ROOT/backend/uploads/" "$SAFETY/uploads/" 2>/dev/null || true

W=$(mktemp -d /tmp/antic-restore-XXXX)
trap 'rm -rf "$W"' EXIT
unzip -q "$ZIP" -d "$W"

SRC=$(find "$W" -maxdepth 2 -type d \( -name 'work-*' -o -name 'light-*' -o -name 'antic-*' \) 2>/dev/null | head -1 || true)
[[ -z "$SRC" ]] && SRC=$(find "$W" -type d -name db -printf '%h\n' 2>/dev/null | head -1 || true)
[[ -z "$SRC" ]] && SRC="$W"
echo "منبع: $SRC"

mkdir -p "$ROOT/backend/prisma" "$ROOT/backend/uploads"
if [[ -f "$SRC/db/dev.db" ]]; then
  rm -f "$ROOT/backend/prisma/dev.db"-wal "$ROOT/backend/prisma/dev.db"-shm "$ROOT/backend/prisma/dev.db"-journal
  cp -a "$SRC/db/dev.db" "$ROOT/backend/prisma/dev.db"
  echo "OK db"
fi
if [[ -f "$SRC/env/backend.env" ]]; then
  cp -a "$SRC/env/backend.env" "$ROOT/backend/.env"
  chmod 600 "$ROOT/backend/.env" || true
  echo "OK env"
fi
if [[ -d "$SRC/uploads" ]] && [[ -n "$(ls -A "$SRC/uploads" 2>/dev/null || true)" ]]; then
  if command -v rsync >/dev/null; then
    rsync -a --delete "$SRC/uploads/" "$ROOT/backend/uploads/"
  else
    rm -rf "$ROOT/backend/uploads"
    mkdir -p "$ROOT/backend/uploads"
    cp -a "$SRC/uploads/." "$ROOT/backend/uploads/"
  fi
  echo "OK uploads"
else
  echo "uploads در این بک‌آپ نبود (احتمالاً نسخه بله) — عکس‌های سرور ماند"
fi

cd "$ROOT/backend"
npx prisma generate >/dev/null
npx prisma db push >/dev/null 2>&1 || true

if [[ -f ecosystem.config.cjs ]]; then
  pm2 delete antic-api 2>/dev/null || true
  pm2 start ecosystem.config.cjs
  pm2 save >/dev/null 2>&1 || true
else
  pm2 restart antic-api 2>/dev/null || true
fi
sleep 2
curl -sf http://127.0.0.1:3001/api/health && echo || echo "health failed"
echo "ایمنی قبلی: $SAFETY"
echo "تمام."
