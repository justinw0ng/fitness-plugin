#!/usr/bin/env bash
# Capture desktop + mobile Obsidian screenshots, then composite onto the
# laptop/phone device template used as the README hero.
set -euo pipefail

export DISPLAY=:1
VAULT_ID="demo0000000001"
DAILY_FILE="Daily notes/2026-08-11.md"
DASH_FILE="atomics/Dashboard.md"
SHOT_DIR="/tmp/atomic-hero-shots"
DESKTOP_SHOT="${SHOT_DIR}/desktop.png"
MOBILE_SHOT="${SHOT_DIR}/mobile.png"
DASH_MOBILE_SHOT="${SHOT_DIR}/dashboard-mobile.png"
OUT="/workspace/docs/images/atomic-daily-hero.png"
OBSIDIAN="${OBSIDIAN:-/opt/Obsidian/obsidian}"
if [ ! -x "$OBSIDIAN" ]; then
  OBSIDIAN="$(command -v obsidian)"
fi

mkdir -p "$SHOT_DIR" /home/ubuntu/.config/obsidian

SNIPPET_DIR="/workspace/obsidian-demo/.obsidian/snippets"
mkdir -p "$SNIPPET_DIR"
cat > "${SNIPPET_DIR}/hero-capture.css" <<'CSS'
.workspace-ribbon,
.workspace-split.mod-left-split,
.workspace-split.mod-right-split,
.status-bar,
.titlebar,
.view-header,
.workspace-tab-header-container,
.workspace-sidedock-vault-profile,
.mod-root .workspace-tabs .workspace-tab-header-container {
  display: none !important;
}
.markdown-preview-view,
.markdown-source-view.mod-cm6 .cm-scroller {
  padding-top: 20px !important;
}
CSS

python3 - <<'PY'
import json
from pathlib import Path
p = Path("/workspace/obsidian-demo/.obsidian/appearance.json")
data = {}
if p.exists():
    data = json.loads(p.read_text())
data["theme"] = "moonstone"
data["enabledCssSnippets"] = ["hero-capture"]
data["showRibbon"] = False
p.write_text(json.dumps(data, indent=2) + "\n")
PY

pkill -f '/opt/Obsidian/obsidian' 2>/dev/null || true
pkill -f 'obsidian --no-sandbox' 2>/dev/null || true
sleep 2

open_note() {
  local file="$1"
  local encoded
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${file}'''))")
  local uri="obsidian://open?vault=${VAULT_ID}&file=${encoded}"
  "$OBSIDIAN" --no-sandbox "$uri" >/tmp/obsidian-hero.log 2>&1 &
  echo $!
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
  local win="$1"
  local width="$2"
  local height="$3"
  local dest="$4"
  ffmpeg -y -f x11grab -video_size "${width}x${height}" -i :1 -frames:v 1 -update 1 "$dest" >/dev/null 2>&1
}

OBS_PID=$(open_note "$DAILY_FILE")
echo "Obsidian pid $OBS_PID"

WIN=$(wait_for_window '2026-08-11')
if [ -z "$WIN" ]; then
  echo "ERROR: Obsidian window not found"
  tail -50 /tmp/obsidian-hero.log || true
  kill "$OBS_PID" 2>/dev/null || true
  exit 1
fi
echo "Window id: $WIN"
xdotool windowactivate --sync "$WIN"
sleep 2
xdotool key --window "$WIN" Escape
sleep 0.3
xdotool key --window "$WIN" ctrl+backslash || true
sleep 0.3
wmctrl -i -r "$WIN" -b add,undecorated 2>/dev/null || true
sleep 0.3

# --- Desktop (fills the laptop screen) ---
xdotool windowmove --sync "$WIN" 0 0
xdotool windowsize --sync "$WIN" 1600 1000
sleep 1
xdotool windowactivate --sync "$WIN"
xdotool key --window "$WIN" ctrl+Home || true
echo "Waiting for plugin blocks and cover images (desktop)..."
sleep 18
screenshot_window "$WIN" 1600 1000 "$DESKTOP_SHOT"
echo "Saved desktop $(wc -c < "$DESKTOP_SHOT") bytes"

# --- Mobile daily note (fills the phone screen) ---
xdotool windowsize --sync "$WIN" 390 844
xdotool windowmove --sync "$WIN" 0 0
sleep 2
xdotool windowactivate --sync "$WIN"
xdotool key --window "$WIN" ctrl+Home || true
sleep 6
screenshot_window "$WIN" 390 844 "$MOBILE_SHOT"
echo "Saved mobile daily $(wc -c < "$MOBILE_SHOT") bytes"

# --- Mobile dashboard (optional alternate phone screen) ---
ENCODED_DASH=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${DASH_FILE}'))")
xdotool windowactivate --sync "$WIN"
"$OBSIDIAN" --no-sandbox "obsidian://open?vault=${VAULT_ID}&file=${ENCODED_DASH}" >/dev/null 2>&1 || true
sleep 8
xdotool windowsize --sync "$WIN" 390 844
xdotool windowmove --sync "$WIN" 0 0
sleep 2
screenshot_window "$WIN" 390 844 "$DASH_MOBILE_SHOT"
echo "Saved mobile dashboard $(wc -c < "$DASH_MOBILE_SHOT") bytes"

kill "$OBS_PID" 2>/dev/null || true
pkill -f '/opt/Obsidian/obsidian' 2>/dev/null || true
pkill -f 'obsidian --no-sandbox' 2>/dev/null || true
sleep 1

python3 /workspace/scripts/compose-device-hero.py \
  --desktop "$DESKTOP_SHOT" \
  --mobile "$MOBILE_SHOT" \
  --out "$OUT"

echo "Saved $OUT ($(wc -c < "$OUT") bytes)"
