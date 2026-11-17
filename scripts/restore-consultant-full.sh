#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
URL="https://raw.githubusercontent.com/nimarahimloo/antic/0c4b000e77888476055c85da1eb82d765faebefe/backend/src/lib/consultant.ts"
curl -fsSL "$URL" -o backend/src/lib/consultant.ts
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
print("OK restored", p.stat().st_size, "bytes")
assert "buildAssistantReply" in p.read_text()
assert "PLACEHOLDER" not in p.read_text()
print("exports OK")
PY
