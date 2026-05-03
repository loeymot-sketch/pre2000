#!/usr/bin/env bash
# Fail if hex literals appear outside theme SSOT, or if theme.colors appears
# inside a CSS-like string without ${...} (fixed-string needles; BSD-safe).
#
# Prefers ripgrep (rg); falls back to grep for hex + same needles.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"

drop_comment_only_lines() {
  grep -Ev ':[0-9]+:[[:space:]]*//' || true
}

scan_hex_rg() {
  rg --color never --line-number --no-heading \
    '#[0-9A-Fa-f]{3,8}\b' src \
    --glob "*.ts" --glob "*.tsx" \
    --glob "!src/theme/index.ts" \
    --glob "!**/__tests__/**" \
    --glob "!**/*.d.ts" 2>/dev/null | drop_comment_only_lines || true
}

scan_hex_grep() {
  grep -rInE '#[0-9A-Fa-f]{3,8}\b' src \
    --include='*.ts' --include='*.tsx' \
    --exclude-dir=__tests__ 2>/dev/null \
    | grep -vF 'src/theme/index.ts' \
    | drop_comment_only_lines || true
}

BAD_NEEDLES=(
  "solid theme.colors"
  "'1px solid theme.colors"
  "'2px solid theme.colors"
  '"1px solid theme.colors'
  '"2px solid theme.colors'
  $'`1px solid theme.colors'
  $'`2px solid theme.colors'
)

scan_bad_needles_rg() {
  local out=""
  for needle in "${BAD_NEEDLES[@]}"; do
    out+=$(rg --color never --line-number --no-heading -F "$needle" src \
      --glob "*.ts" --glob "*.tsx" \
      --glob "!src/theme/index.ts" \
      --glob "!**/__tests__/**" \
      --glob "!**/*.d.ts" 2>/dev/null || true)
  done
  if [[ -n "$out" ]]; then echo "$out" | sed '/^$/d' | sort -u; fi
}

scan_bad_needles_grep() {
  local out=""
  for needle in "${BAD_NEEDLES[@]}"; do
    out+=$(grep -rFn -- "$needle" src --include='*.ts' --include='*.tsx' --exclude-dir=__tests__ 2>/dev/null \
      | grep -vF 'src/theme/index.ts' || true)
  done
  if [[ -n "$out" ]]; then echo "$out" | sed '/^$/d' | sort -u; fi
}

echo ":: lint:colors :: scanning src/ for #hex outside theme SSOT..."
if command -v rg >/dev/null 2>&1; then
  HEX_OUT="$(scan_hex_rg)"
else
  echo ":: warn :: ripgrep (rg) not in PATH — using grep fallback for hex."
  HEX_OUT="$(scan_hex_grep)"
fi

if [[ -n "${HEX_OUT// }" ]]; then
  echo "$HEX_OUT"
  echo ":: fail :: hex literals found outside src/theme/index.ts"
  exit 1
fi

# rgba( literals: allowed only in theme SSOT + hexToRgba implementation (dynamic opacity / fallbacks).
scan_rgba_rg() {
  rg --color never --line-number --no-heading \
    'rgba\(' src \
    --glob "*.ts" --glob "*.tsx" \
    --glob "!src/theme/index.ts" \
    --glob "!src/utils/styleUtils.ts" \
    --glob "!**/__tests__/**" \
    --glob "!**/*.d.ts" 2>/dev/null | drop_comment_only_lines || true
}

scan_rgba_grep() {
  grep -rInE 'rgba\(' src --include='*.ts' --include='*.tsx' --exclude-dir=__tests__ 2>/dev/null \
    | grep -vF 'src/theme/index.ts' \
    | grep -vF 'src/utils/styleUtils.ts' \
    | drop_comment_only_lines || true
}

echo ":: lint:colors :: scanning src/ for rgba( outside theme SSOT + styleUtils..."
if command -v rg >/dev/null 2>&1; then
  RGBA_OUT="$(scan_rgba_rg)"
else
  RGBA_OUT="$(scan_rgba_grep)"
fi

if [[ -n "${RGBA_OUT// }" ]]; then
  echo "$RGBA_OUT"
  echo ":: fail :: rgba( literals found outside src/theme/index.ts and src/utils/styleUtils.ts"
  exit 3
fi

echo ":: lint:colors :: scanning for known-bad theme.colors string patterns..."
if command -v rg >/dev/null 2>&1; then
  STR_OUT="$(scan_bad_needles_rg)"
else
  STR_OUT="$(scan_bad_needles_grep)"
fi

if [[ -n "${STR_OUT// }" ]]; then
  echo "$STR_OUT"
  echo ":: fail :: theme.colors used inside a literal CSS string (use \${theme.colors.x})"
  exit 2
fi

echo ":: ok :: lint:colors passed."
