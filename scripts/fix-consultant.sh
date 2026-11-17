#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
curl -fsSL "https://raw.githubusercontent.com/nimarahimloo/antic/0c4b000e77888476055c85da1eb82d765faebefe/backend/src/lib/consultant.ts" \
  -o backend/src/lib/consultant.ts
python3 - <<'PY'
from pathlib import Path
p = Path("backend/src/lib/consultant.ts")
lines = p.read_text(encoding="utf-8").splitlines(keepends=True)
for i, line in enumerate(lines):
    if "categories.slice(0, 24)" in line:
        lines[i] = (
            '    const lines = categories.slice(0, 24).map((c) => '
            '"• **" + (c.name || "") + "** (`" + c.slug + "`)").join("\\n");\n'
        )
        break
p.write_text("".join(lines), encoding="utf-8")
print("OK: consultant.ts restored and fixed")
PY
cd backend && npx tsx --eval "import('./src/lib/consultant.ts').then(() => console.log('syntax OK'))"
