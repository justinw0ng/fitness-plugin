#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

OUT="docs/images/fitness-actions.png"
URL="file://$PWD/docs/fixtures/actions-note-pane.html"
# Prefer the binary over /usr/local/bin/google-chrome, which forces a shared
# --user-data-dir and --remote-debugging-port that break headless screenshots.
if [[ -z "${CHROME:-}" ]]; then
  if [[ -x /usr/bin/google-chrome-stable ]]; then
    CHROME=/usr/bin/google-chrome-stable
  else
    CHROME=google-chrome
  fi
fi

PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/fitness-actions-chrome.XXXXXX")"
cleanup() { rm -rf "$PROFILE"; }
trap cleanup EXIT

run_chrome() {
  # Chrome can linger after --screenshot; timeout treats a written file as success.
  set +e
  timeout 45 "$@" \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --hide-scrollbars \
    --user-data-dir="$PROFILE" \
    --force-device-scale-factor=2 \
    --window-size=1200,520 \
    --screenshot="$OUT" \
    "$URL"
  local code=$?
  set -e
  if [[ $code -eq 0 || ($code -eq 124 && -s "$OUT") ]]; then
    return 0
  fi
  return "$code"
}

rm -f "$OUT"
if ! run_chrome "$CHROME"; then
  echo "headless capture failed; retrying under xvfb-run" >&2
  rm -f "$OUT"
  run_chrome xvfb-run -a "$CHROME"
fi

if [[ ! -s "$OUT" ]]; then
  echo "capture produced no screenshot at $OUT" >&2
  exit 1
fi

echo "wrote $OUT ($(wc -c <"$OUT") bytes)"
