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

measure_crop_top() {
  local win="$1"
  python3 - "$win" <<'PY'
import re
import subprocess
import sys

DEFAULT = 30
win = sys.argv[1]
try:
    out = subprocess.check_output(["xwininfo", "-id", win, "-frame"], text=True, stderr=subprocess.DEVNULL)
except subprocess.CalledProcessError:
    print(DEFAULT)
    raise SystemExit

blocks: list[dict[str, int]] = []
current: dict[str, int] = {}
for line in out.splitlines():
    if line.startswith("xwininfo:"):
        if current:
            blocks.append(current)
        current = {}
        continue
    match = re.match(r"\s*([^:]+):\s*(-?\d+)", line)
    if match:
        current[match.group(1).strip()] = int(match.group(2))
if current:
    blocks.append(current)

if len(blocks) < 2:
    print(DEFAULT)
    raise SystemExit

outer_y = blocks[0].get("Absolute upper-left Y")
inner_y = blocks[1].get("Absolute upper-left Y")
if outer_y is None or inner_y is None:
    print(DEFAULT)
else:
    measured = max(0, inner_y - outer_y)
    print(measured if measured > 0 else DEFAULT)
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

detect_and_crop_screenshot() {
  local source="$1"
  local dest="$2"
  local width="$3"
  local height="$4"
  python3 - "$source" "$dest" "$width" "$height" <<'PY'
import sys
from pathlib import Path

from PIL import Image

source, dest, width_s, height_s = sys.argv[1:5]
width = int(width_s)
height = int(height_s)
image = Image.open(source).convert("RGB")

def row_is_tab_bar(y: int, threshold: int = 240, min_ratio: float = 0.8) -> bool:
    white = 0
    for x in range(width):
        r, g, b = image.getpixel((x, y))
        if r >= threshold and g >= threshold and b >= threshold:
            white += 1
    return white / width >= min_ratio

crop_top = 0
for y in range(image.height):
    if row_is_tab_bar(y):
        crop_top = y
        break

if crop_top == 0:
    r, g, b = image.getpixel((width // 2, 0))
    if not (r >= 240 and g >= 240 and b >= 240):
        print(
            f"ERROR: could not detect OS title-bar strip to crop in {source}; "
            f"top row RGB=({r},{g},{b})",
            file=sys.stderr,
        )
        raise SystemExit(1)

if crop_top + height > image.height:
    print(
        f"ERROR: crop_top={crop_top} + height={height} exceeds capture height {image.height}",
        file=sys.stderr,
    )
    raise SystemExit(1)

cropped = image.crop((0, crop_top, width, crop_top + height))
if cropped.size != (width, height):
    print(f"ERROR: cropped size {cropped.size} != expected ({width}, {height})", file=sys.stderr)
    raise SystemExit(1)

cropped.save(dest)
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
  xdotool windowmove --sync "$win" 0 0

  local crop_top
  crop_top=$(measure_crop_top "$win")
  local capture_height=$((height + crop_top))

  wmctrl -i -r "$win" -b add,undecorated 2>/dev/null || true
  sleep 0.5

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
  detect_and_crop_screenshot "$raw" "$destination" "$width" "$height"
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
