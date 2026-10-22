#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/fonts-b64"
DEST="$ROOT/public/fonts"
if [[ ! -d "$SRC" ]]; then
  echo "No public/fonts-b64 — place woff2 under public/fonts/ or unzip antic-fonts-organized.zip"
  exit 0
fi
mkdir -p "$DEST/yekan-bakh" "$DEST/kalameh" "$DEST/peyda"
for family in yekan-bakh kalameh peyda; do
  for f in "$SRC/$family"/*.woff2.b64; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .b64)
    base64 -d "$f" > "$DEST/$family/$name"
  done
done
echo "Fonts ready under public/fonts/"
find "$DEST" -name '*.woff2' | sort
