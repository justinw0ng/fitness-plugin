#!/usr/bin/env bash
# Capture desktop + mobile Obsidian screenshots, then composite onto the
# landing banner used as the README hero.
set -euo pipefail

export DISPLAY=:1
VAULT_ID="demo0000000001"
DAILY_FILE="Daily notes/2026-08-11.md"
SHOT_DIR="/tmp/atomic-hero-shots"
DESKTOP_SHOT="${SHOT_DIR}/desktop.png"
MOBILE_SHOT="${SHOT_DIR}/mobile.png"
OUT="/workspace/docs/images/atomic-daily-hero.png"
OBSIDIAN="${OBSIDIAN:-/opt/Obsidian/obsidian}"
if [ ! -x "$OBSIDIAN" ]; then
  OBSIDIAN="$(command -v obsidian)"
fi

mkdir -p "$SHOT_DIR" /home/ubuntu/.config/obsidian

OBS_PID=""

stop_obsidian() {
  if [[ -n "${OBS_PID}" ]] && kill -0 "${OBS_PID}" 2>/dev/null; then
    kill -TERM -- "-${OBS_PID}" 2>/dev/null || true
    wait "${OBS_PID}" 2>/dev/null || true
  fi
  OBS_PID=""
}

trap stop_obsidian EXIT

start_obsidian() {
  local encoded
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${DAILY_FILE}'))")
  local uri="obsidian://open?vault=${VAULT_ID}&file=${encoded}"
  setsid "$OBSIDIAN" --no-sandbox "$uri" >/tmp/obsidian-hero.log 2>&1 &
  OBS_PID=$!
}

wait_for_window() {
  local needle="$1"
  local win=""
  for _ in $(seq 1 90); do
    win=$(xdotool search --name "$needle" 2>/dev/null | tail -1 || true)
    if [ -n "$win" ]; then
      echo "$win"
      return 0
    fi
    sleep 2
  done
  win=$(xdotool search --name 'obsidian-demo' 2>/dev/null | tail -1 || true)
  echo "$win"
}

screenshot_window() {
  local width="$1"
  local height="$2"
  local dest="$3"
  ffmpeg -y \
    -f x11grab \
    -video_size "${width}x${height}" \
    -i :1 \
    -frames:v 1 \
    -update 1 \
    "$dest" >/dev/null 2>&1
}

capture_daily_note() {
  local width="$1"
  local height="$2"
  local destination="$3"
  local wait_seconds="$4"

  start_obsidian
  local win
  win=$(wait_for_window "2026-08-11")
  if [[ -z "$win" ]]; then
    echo "ERROR: Obsidian daily-note window not found" >&2
    tail -50 /tmp/obsidian-hero.log >&2 || true
    exit 1
  fi

  xdotool windowactivate --sync "$win"
  xdotool key --window "$win" Escape
  wmctrl -i -r "$win" -b add,undecorated 2>/dev/null || true
  xdotool windowmove --sync "$win" 0 0
  xdotool windowsize --sync "$win" "$width" "$height"
  xdotool windowactivate --sync "$win"
  xdotool key --window "$win" ctrl+Home || true
  sleep "$wait_seconds"

  screenshot_window "$width" "$height" "$destination"
  if [[ ! -s "$destination" ]]; then
    echo "ERROR: screenshot was not created: $destination" >&2
    exit 1
  fi
  stop_obsidian
  sleep 2
}

if pgrep -x obsidian >/dev/null 2>&1; then
  echo "ERROR: Obsidian is already running. Close it before capturing." >&2
  pgrep -x obsidian >&2
  exit 1
fi

node /workspace/scripts/seed-readme-demo-vault.mjs
capture_daily_note 1600 900 "$DESKTOP_SHOT" 18
echo "Saved desktop $(wc -c < "$DESKTOP_SHOT") bytes"

node /workspace/scripts/seed-readme-demo-vault.mjs --book-limit 3
python3 - <<'PY'
import json
from pathlib import Path
workspace = Path("/workspace/obsidian-demo/.obsidian/workspace.json")
data = json.loads(workspace.read_text())
if "left" in data:
    data["left"]["collapsed"] = True
workspace.write_text(json.dumps(data, indent=2) + "\n")
PY
capture_daily_note 390 844 "$MOBILE_SHOT" 10
echo "Saved mobile $(wc -c < "$MOBILE_SHOT") bytes"

python3 /workspace/scripts/compose-device-hero.py \
  --desktop "$DESKTOP_SHOT" \
  --mobile "$MOBILE_SHOT" \
  --out "$OUT"

echo "Saved $OUT ($(wc -c < "$OUT") bytes)"
