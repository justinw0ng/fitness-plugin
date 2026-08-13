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
  return 1
}

title_bar_height() {
  local win="$1"
  python3 - "$win" <<'PY'
import re
import subprocess
import sys

win = sys.argv[1]
try:
    out = subprocess.check_output(["xwininfo", "-id", win, "-frame"], text=True, stderr=subprocess.DEVNULL)
except subprocess.CalledProcessError:
    print(0)
    raise SystemExit

def parse_block(text: str) -> dict[str, int]:
    values: dict[str, int] = {}
    for line in text.splitlines():
        match = re.match(r"\s*([^:]+):\s*(-?\d+)", line)
        if match:
            values[match.group(1).strip()] = int(match.group(2))
    return values

outer = parse_block(out.split("xwininfo:", 1)[0])
inner = parse_block(out.split("xwininfo:", 1)[1] if "xwininfo:" in out else "")
if not outer or not inner:
    print(0)
else:
    print(max(0, inner.get("Absolute upper-left Y", 0) - outer.get("Absolute upper-left Y", 0)))
PY
}

patch_desktop_capture_appearance() {
  python3 - <<'PY'
import json
from pathlib import Path

app = Path("/workspace/obsidian-demo/.obsidian/app.json")
data = json.loads(app.read_text())
data["baseFontSize"] = 13
app.write_text(json.dumps(data, indent=2) + "\n")
PY
}

finalize_screenshot() {
  local source="$1"
  local dest="$2"
  local width="$3"
  local height="$4"
  local crop_top="$5"
  python3 - "$source" "$dest" "$width" "$height" "$crop_top" <<'PY'
import sys
from pathlib import Path

from PIL import Image

source, dest, width_s, height_s, crop_top_s = sys.argv[1:6]
width = int(width_s)
height = int(height_s)
crop_top = int(crop_top_s)
image = Image.open(source)
if crop_top > 0:
    image = image.crop((0, crop_top, width, crop_top + height))
elif image.size != (width, height):
    image = image.crop((0, 0, width, height))
image.save(dest)
Path(source).unlink(missing_ok=True)
PY
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
  local zoom_steps="${5:-0}"

  start_obsidian
  local win
  win=$(wait_for_window "2026-08-11") || true
  if [[ -z "$win" ]]; then
    echo "ERROR: Obsidian daily-note window not found" >&2
    tail -50 /tmp/obsidian-hero.log >&2 || true
    exit 1
  fi

  xdotool windowactivate --sync "$win"
  xdotool key --window "$win" Escape
  wmctrl -i -r "$win" -b add,undecorated 2>/dev/null || true
  sleep 0.5

  local title_bar
  title_bar=$(title_bar_height "$win")
  local capture_height=$((height + title_bar))

  xdotool windowmove --sync "$win" 0 0
  xdotool windowsize --sync "$win" "$width" "$capture_height"
  xdotool windowactivate --sync "$win"
  xdotool key --window "$win" ctrl+Home || true
  sleep "$wait_seconds"

  if [[ "$zoom_steps" -gt 0 ]]; then
    for _ in $(seq 1 "$zoom_steps"); do
      xdotool key --window "$win" ctrl+minus
      sleep 0.4
    done
    sleep 1
  fi

  local raw="${destination}.raw.png"
  screenshot_window "$width" "$capture_height" "$raw"
  finalize_screenshot "$raw" "$destination" "$width" "$height" "$title_bar"
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
patch_desktop_capture_appearance
capture_daily_note 1600 900 "$DESKTOP_SHOT" 18 2
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
