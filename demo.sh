#!/usr/bin/env bash
# SecureScout — One-Command Demo (macOS / Linux)
#   scan -> risk score -> JSON + premium HTML report -> auto-fixed requirements
#   then opens the HTML report.
#   Usage:  ./demo.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

cyan()  { printf '\033[36m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
gray()  { printf '\033[90m%s\033[0m\n' "$1"; }

section() { echo; cyan "  $1"; gray "  $(printf '%*s' "${#1}" '' | tr ' ' '-')"; }

PY="$(command -v python3 || command -v python || true)"
[ -z "$PY" ] && { echo "  [X] Python not found on PATH."; exit 1; }

echo
printf '\033[34m  =====================================================\033[0m\n'
printf '\033[97m     SecureScout v3.0  -  Live Demo\033[0m\n'
printf '\033[90m     PSB Hackathon 2026  -  Problem Statement 3\033[0m\n'
printf '\033[34m  =====================================================\033[0m\n'

section "Step 1/4  Installing scanner dependencies"
"$PY" -m pip install -q -e .
green "  [ok] dependencies ready"

TARGET="vulnerable_bank_app"
HTML="$ROOT/securescout_report.html"
JSON="$ROOT/securescout_report.json"

section "Step 2/4  Scanning '$TARGET'"
set +e
"$PY" securescout/cli/scan.py "$TARGET" --output all --report "$HTML" --json-out "$JSON" --autofix
code=$?
set -e
[ "$code" -ne 0 ] && [ "$code" -ne 1 ] && { echo "  [X] Scan failed (exit $code)."; exit 1; }

section "Step 3/4  Generated artifacts"
for f in "$JSON" "$HTML" "$ROOT/$TARGET/requirements.fixed.txt"; do
  if [ -f "$f" ]; then green "  [ok] $(basename "$f")"; else gray "  [--] $(basename "$f") (not generated)"; fi
done

section "Step 4/4  Opening premium HTML report"
if [ -f "$HTML" ]; then
  if command -v open >/dev/null;      then open "$HTML"
  elif command -v xdg-open >/dev/null; then xdg-open "$HTML"; fi
  green "  [ok] report opened"
fi

echo
printf '\033[97m  Demo complete.\033[0m\n'
gray "  Next: launch the dashboard -> npm run dev (apps/web on http://localhost:3000)"
echo
