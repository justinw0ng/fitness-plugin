#!/usr/bin/env bash
# Launch Obsidian, open daily note, capture hero screenshot for README.
set -euo pipefail

export DISPLAY=:1
VAULT_ID="a1b2c3d4e5f67890"
DAILY_FILE="Daily notes/2026-08-11.md"
OUT="/workspace/docs/images/atomic-daily-hero.png"
OBSIDIAN="/opt/Obsidian/obsidian"

mkdir -p /home/ubuntu/.config/obsidian

pkill -f '/opt/Obsidian/obsidian' 2>/dev/null || true
sleep 2

# Registered vault + daily note via URI
ENCODED_FILE=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${DAILY_FILE}'))")
URI="obsidian://open?vault=${VAULT_ID}&file=${ENCODED_FILE}"

"$OBSIDIAN" --no-sandbox "$URI" &
OBS_PID=$!

echo "Waiting for Obsidian daily note window..."
for i in $(seq 1 90); do
  WIN=$(xdotool search --name '2026-08-11' 2>/dev/null | head -1)
  if [ -n "$WIN" ]; then
    break
  fi
  sleep 2
done

WIN=$(xdotool search --name '2026-08-11' 2>/dev/null | head -1)
if [ -z "$WIN" ]; then
  WIN=$(xdotool search --name 'obsidian-demo' 2>/dev/null | head -1)
fi

if [ -z "$WIN" ]; then
  echo "ERROR: Obsidian window not found"
  kill $OBS_PID 2>/dev/null || true
  exit 1
fi

echo "Window id: $WIN"
xdotool windowactivate --sync "$WIN"
sleep 2

# Fullscreen
xdotool key --window "$WIN" F11
sleep 1

# Ensure reading/preview mode shows rendered blocks (Escape closes overlays)
xdotool key --window "$WIN" Escape
sleep 0.5

echo "Waiting for plugin blocks and cover images..."
sleep 18

xdotool key --window "$WIN" ctrl+Home
sleep 1

ffmpeg -y -f x11grab -video_size 1920x1200 -i :1 -frames:v 1 -update 1 "$OUT" 2>/dev/null

if [ ! -f "$OUT" ]; then
  echo "ERROR: Screenshot failed"
  kill $OBS_PID 2>/dev/null || true
  exit 1
fi

echo "Saved $OUT ($(wc -c < "$OUT") bytes)"

kill $OBS_PID 2>/dev/null || true
pkill -f '/opt/Obsidian/obsidian' 2>/dev/null || true
