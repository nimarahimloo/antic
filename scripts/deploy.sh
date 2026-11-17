#!/usr/bin/env bash
# دیپلوی ساده پرده آنتیک روی سرور
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> وضعیت git"
git status -sb || true

echo "==> کنار گذاشتن تغییرات لوکال روی فایل‌های track‌شده (env/db دست نخورده می‌مانند)"
git checkout -- . 2>/dev/null || true
git clean -fd -e backend/.env -e backend/uploads -e backend/*.db -e backend/prisma/*.db -e .env 2>/dev/null || true

echo "==> pull"
git pull origin dev

echo "==> بازیابی consultant.ts سالم (اگر لازم بود)"
GOOD_URL="https://raw.githubusercontent.com/nimarahimloo/antic/0c4b000e77888476055c85da1eb82d765faebefe/backend/src/lib/consultant.ts"
if grep -qE '<<<<<<|>>>>>>|=======' backend/src/lib/consultant.ts 2>/dev/null || \
   ! grep -q 'buildConsultantReply' backend/src/lib/consultant.ts 2>/dev/null; then
  echo "    فایل خراب است — دانلود نسخه سالم..."
  curl -fsSL "$GOOD_URL" -o backend/src/lib/consultant.ts
fi

# فیکس تمپلیت خط categories.slice
python3 - <<'PY'
from pathlib import Path
p = Path("backend/src/lib/consultant.ts")
text = p.read_text(encoding="utf-8")
if "<<<<<<<" in text or ">>>>>>>" in text:
    raise SystemExit("merge markers still present")
lines = text.splitlines(keepends=True)
for i, line in enumerate(lines):
    if "categories.slice(0, 24)" in line and "\\`" in line:
        lines[i] = (
            '    const lines = categories.slice(0, 24).map((c) => '
            '"• **" + (c.name || "") + "** (`" + c.slug + "`)").join("\\n");\n'
        )
        p.write_text("".join(lines), encoding="utf-8")
        print("    fixed template literal")
        break
PY

echo "==> فرانت"
npm install --no-audit --no-fund
npm run build

echo "==> بک‌اند"
cd backend
npm install --no-audit --no-fund
npx prisma generate

echo "==> ری‌استارت پورت 3001"
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

if command -v pm2 >/dev/null 2>&1 && pm2 describe antic-backend >/dev/null 2>&1; then
  pm2 restart antic-backend
  echo "pm2: antic-backend restarted"
else
  echo "بک‌اند را با یکی از این‌ها بالا بیاورید:"
  echo "  cd $ROOT/backend && npm run dev"
  echo "  یا: pm2 start npm --name antic-backend -- run dev"
fi

echo "==> health"
sleep 1
curl -sf http://127.0.0.1:3001/api/health && echo || echo "(بک‌اند هنوز بالا نیست — دستی npm run dev بزنید)"
echo "تمام."
