#!/usr/bin/env bash
# Capture desktop + mobile Obsidian screenshots, then composite onto the
# landing banner used as the README hero.
set -euo pipefail

export DISPLAY=:1
VAULT_PATH="${VAULT_PATH:-/workspace/obsidian-demo}"
DAILY_FILE="Daily notes/2026-08-11.md"
SHOT_DIR="/tmp/atomic-hero-shots"
DESKTOP_SHOT="${SHOT_DIR}/desktop.png"
MOBILE_SHOT="${SHOT_DIR}/mobile.png"
OUT="/workspace/docs/images/atomic-daily-hero.png"

resolve_vault_id() {
  if [[ -n "${VAULT_ID:-}" ]]; then
    printf '%s\n' "$VAULT_ID"
    return 0
  fi
  python3 - "$VAULT_PATH" <<'PY'
import json
import sys
from pathlib import Path

target = Path(sys.argv[1]).resolve()
config = Path.home() / ".config/obsidian/obsidian.json"
if config.is_file():
    for vault_id, info in json.loads(config.read_text()).get("vaults", {}).items():
        if Path(info.get("path", "")).resolve() == target:
            print(vault_id)
            raise SystemExit(0)
print(target.name)
PY
}

VAULT_ID="$(resolve_vault_id)"

OBSIDIAN="${OBSIDIAN:-/opt/Obsidian/obsidian}"
if [ ! -x "$OBSIDIAN" ]; then
  OBSIDIAN="$(command -v obsidian || true)"
fi
if [ -z "$OBSIDIAN" ] || [ ! -x "$OBSIDIAN" ]; then
  echo "ERROR: Obsidian not found. Install Obsidian or set OBSIDIAN=/path/to/obsidian" >&2
  exit 1
fi

mkdir -p "$SHOT_DIR" "${HOME}/.config/obsidian"

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
  setsid "$OBSIDIAN" --no-sandbox --disable-gpu --disable-software-rasterizer "$uri" >/tmp/obsidian-hero.log 2>&1 &
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

install_minimal_theme() {
  local dest="/workspace/obsidian-demo/.obsidian/themes/Minimal"
  mkdir -p "$dest"
  if [[ ! -f "$dest/theme.css" || ! -f "$dest/manifest.json" ]]; then
    rm -rf /tmp/obsidian-minimal
    git clone --depth 1 https://github.com/kepano/obsidian-minimal.git /tmp/obsidian-minimal
    cp /tmp/obsidian-minimal/theme.css /tmp/obsidian-minimal/manifest.json "$dest/"
  fi
}

write_note_only_snippet() {
  local snippet_dir="/workspace/obsidian-demo/.obsidian/snippets"
  mkdir -p "$snippet_dir"
  cat > "${snippet_dir}/hero-note-only.css" <<'CSS'
.workspace-ribbon,
.workspace-split.mod-left-split,
.workspace-split.mod-right-split,
.status-bar,
.titlebar,
.titlebar-button-container,
.view-header,
.workspace-tab-header-container,
.workspace-sidedock-vault-profile,
.mod-root .workspace-tabs .workspace-tab-header-container,
.sidebar-toggle-button,
.workspace-drawer-vault-profile {
  display: none !important;
}

.workspace-split.mod-root,
.workspace-leaf,
.workspace-leaf-content,
.view-content {
  margin: 0 !important;
  padding: 0 !important;
  max-width: 100% !important;
}

.markdown-preview-view,
.markdown-source-view.mod-cm6 .cm-scroller {
  padding-top: 20px !important;
  padding-left: 28px !important;
  padding-right: 28px !important;
}

/* Hide all scrollbars in hero captures only (this snippet is capture-only). */
body {
  --scrollbar-thumb-bg: transparent !important;
  --scrollbar-active-thumb-bg: transparent !important;
  --scrollbar-bg: transparent !important;
}

body *,
body *::-webkit-scrollbar {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

body *::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}

.fitness-plugin .atomic-book-row-books,
.fitness-plugin .fitness-heatmap-scroll {
  overflow: hidden !important;
}

.fitness-plugin .atomic-book-shelf-row {
  overflow: hidden !important;
}
CSS
}

patch_capture_appearance() {
  python3 - <<'PY'
import json
from pathlib import Path

vault = Path("/workspace/obsidian-demo/.obsidian")
app = json.loads((vault / "app.json").read_text())
app["readableLineLength"] = False
app["livePreview"] = True
app["baseFontSize"] = 15
(vault / "app.json").write_text(json.dumps(app, indent=2) + "\n")

appearance = json.loads((vault / "appearance.json").read_text())
appearance["theme"] = "moonstone"
appearance["cssTheme"] = "Minimal"
appearance["showRibbon"] = False
appearance["enabledCssSnippets"] = ["hero-note-only"]
(vault / "appearance.json").write_text(json.dumps(appearance, indent=2) + "\n")

workspace = vault / "workspace.json"
if workspace.exists():
    data = json.loads(workspace.read_text())
    if "left" in data:
        data["left"]["collapsed"] = True
    if "right" in data:
        data["right"]["collapsed"] = True

    def force_preview(node):
        if not isinstance(node, dict):
            return
        state = node.get("state")
        if node.get("type") == "leaf" and isinstance(state, dict) and state.get("type") == "markdown":
            inner = state.setdefault("state", {})
            inner["mode"] = "preview"
            inner["source"] = False
            inner["file"] = "Daily notes/2026-08-11.md"
        for child in node.get("children", []):
            force_preview(child)

    force_preview(data.get("main", {}))
    workspace.write_text(json.dumps(data, indent=2) + "\n")
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

def row_is_note_canvas(y: int, min_luma: float = 220, min_ratio: float = 0.75) -> bool:
    light = 0
    step = 4
    sampled = 0
    for x in range(0, width, step):
        r, g, b = image.getpixel((x, y))
        luma = 0.299 * r + 0.587 * g + 0.114 * b
        if luma >= min_luma:
            light += 1
        sampled += 1
    return sampled > 0 and light / sampled >= min_ratio

crop_top = 0
for y in range(image.height):
    if row_is_note_canvas(y):
        crop_top = y
        break

if crop_top == 0:
    r, g, b = image.getpixel((width // 2, 0))
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    if luma < 220:
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

scrub_hero_scrollbars() {
  local image="$1"
  python3 - "$image" <<'PY'
import statistics
import sys
from pathlib import Path

from PIL import Image

path = Path(sys.argv[1])
image = Image.open(path).convert("RGB")
width, height = image.size
pixels = image.load()

x_start = int(width * 0.06)
x_end = int(width * 0.94)
y_start = int(height * 0.20)
y_end = int(height * 0.38)

def row_stats(y: int) -> tuple[float, float]:
    row = [pixels[x, y] for x in range(x_start, x_end, 2)]
    luma = [sum(channel) / 3 for channel in row]
    return sum(luma) / len(luma), statistics.pstdev(luma)

def is_scrollbar_pixel(r: int, g: int, b: int) -> bool:
    luma = (r + g + b) / 3
    return 225 <= luma <= 240 and max(r, g, b) - min(r, g, b) < 18

runs = []
run_start = None
for y in range(y_start, y_end):
    mean, std = row_stats(y)
    is_track = std < 8 and 228 <= mean <= 240
    if is_track:
        if run_start is None:
            run_start = y
        continue
    if run_start is not None:
        runs.append((run_start, y - 1))
        run_start = None
if run_start is not None:
    runs.append((run_start, y_end - 1))

for start, end in runs:
    track_height = end - start + 1
    if track_height < 1 or track_height > 25:
        continue
    fill = (245, 245, 245)
    for sample_y in range(end + 1, min(y_end, end + 24)):
        mean, std = row_stats(sample_y)
        if std < 3 and mean >= 242:
            sample_row = [pixels[x, sample_y] for x in range(x_start, x_end, 4)]
            fill = tuple(sorted(channel)[len(sample_row) // 2] for channel in zip(*sample_row))
            break
    for y in range(start, end + 1):
        for x in range(x_start, x_end):
            r, g, b = pixels[x, y]
            if is_scrollbar_pixel(r, g, b):
                pixels[x, y] = fill

image.save(path)
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
  xdotool mousemove 1910 10
  sleep 12

  local raw="${destination}.raw.png"
  local min_striped="${6:-8}"
  local deadline=$((SECONDS + 120))
  while true; do
    screenshot_window "$width" "$capture_height" "$raw"
    detect_and_crop_screenshot "$raw" "$destination" "$width" "$height"
    scrub_hero_scrollbars "$destination"
    if python3 /workspace/scripts/verify-hero-covers.py "$destination" "$min_striped"
    then
      break
    fi
    if (( SECONDS >= deadline )); then
      echo "ERROR: typographic book covers did not render in time: $destination" >&2
      exit 1
    fi
    sleep 2
  done
  if [[ ! -s "$destination" ]]; then
    echo "ERROR: screenshot was not created: $destination" >&2
    exit 1
  fi
  stop_obsidian
  sleep 2
}

verify_shelf_covers() {
  local image="$1"
  local min_striped="$2"
  python3 /workspace/scripts/verify-hero-covers.py "$image" "$min_striped"
}

if pgrep -x obsidian >/dev/null 2>&1; then
  echo "ERROR: Obsidian is already running. Close it before capturing." >&2
  pgrep -x obsidian >&2
  exit 1
fi

node /workspace/scripts/seed-readme-demo-vault.mjs
install_minimal_theme
write_note_only_snippet
patch_capture_appearance
capture_daily_note 1600 900 "$DESKTOP_SHOT" 20 0 8
echo "Saved desktop $(wc -c < "$DESKTOP_SHOT") bytes"
verify_shelf_covers "$DESKTOP_SHOT" 8

node /workspace/scripts/seed-readme-demo-vault.mjs --book-limit 3
install_minimal_theme
write_note_only_snippet
patch_capture_appearance
capture_daily_note 390 844 "$MOBILE_SHOT" 12 0 2
echo "Saved mobile $(wc -c < "$MOBILE_SHOT") bytes"
verify_shelf_covers "$MOBILE_SHOT" 2

python3 /workspace/scripts/compose-device-hero.py \
  --desktop "$DESKTOP_SHOT" \
  --mobile "$MOBILE_SHOT" \
  --out "$OUT"

echo "Saved $OUT ($(wc -c < "$OUT") bytes)"

GIF_OUT="/workspace/docs/images/atomic-daily-hero.gif"
python3 /workspace/scripts/animate-hero-gif.py \
  --desktop "$DESKTOP_SHOT" \
  --mobile "$MOBILE_SHOT" \
  --out "$GIF_OUT"
echo "Saved $GIF_OUT ($(wc -c < "$GIF_OUT") bytes)"
