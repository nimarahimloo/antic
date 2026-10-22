#!/usr/bin/env bash
# نصب مرتب فونت‌ها از fonts.zip یا antic-fonts-organized.zip
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/public/fonts"
ZIP="${1:-}"

mkdir -p "$DEST/yekan-bakh" "$DEST/kalameh" "$DEST/peyda"

if [[ -z "$ZIP" ]]; then
  echo "Usage: ./scripts/install-fonts.sh path/to/fonts.zip"
  echo "یا:    ./scripts/install-fonts.sh path/to/antic-fonts-organized.zip"
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q -o "$ZIP" -d "$TMP"

# اگر از قبل مرتب شده باشد
if [[ -d "$TMP/yekan-bakh" ]]; then
  cp -f "$TMP"/yekan-bakh/*.woff2 "$DEST/yekan-bakh/" 2>/dev/null || true
  cp -f "$TMP"/kalameh/*.woff2 "$DEST/kalameh/" 2>/dev/null || true
  cp -f "$TMP"/peyda/*.woff2 "$DEST/peyda/" 2>/dev/null || true
  echo "Installed organized fonts into public/fonts"
  find "$DEST" -name '*.woff2' | sort
  exit 0
fi

# از پکیج خام fonts.zip
find "$TMP" -name 'YekanBakhFaNum-Regular.woff2' -exec cp {} "$DEST/yekan-bakh/YekanBakh-Regular.woff2" \;
find "$TMP" -name 'YekanBakhFaNum-SemiBold.woff2' -exec cp {} "$DEST/yekan-bakh/YekanBakh-SemiBold.woff2" \;
find "$TMP" -name 'YekanBakhFaNum-Bold.woff2' -exec cp {} "$DEST/yekan-bakh/YekanBakh-Bold.woff2" \;

for w in Thin ExtraLight Light Regular Medium SemiBold Bold ExtraBold Black; do
  f=$(find "$TMP" -path '*Farsi_Numerals*' -name "KalamehWebFaNum-${w}.woff2" | head -1)
  [[ -n "$f" ]] && cp "$f" "$DEST/kalameh/Kalameh-${w}.woff2"
done

for w in Thin ExtraLight Light Regular Medium SemiBold Bold ExtraBold Black; do
  f=$(find "$TMP" -iname "PeydaWeb-${w}.woff2" -o -iname "peydaWeb-${w}.woff2" | head -1)
  [[ -n "$f" ]] && cp "$f" "$DEST/peyda/Peyda-${w}.woff2"
done
# lowercase variants
for pair in "extralight:ExtraLight" "light:Light"; do
  src="${pair%%:*}"; dst="${pair##*:}"
  f=$(find "$TMP" -iname "peydaWeb-${src}.woff2" | head -1)
  [[ -n "$f" ]] && cp "$f" "$DEST/peyda/Peyda-${dst}.woff2"
done

echo "Installed from raw zip into public/fonts"
find "$DEST" -name '*.woff2' | sort
