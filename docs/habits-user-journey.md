# User journey — base colors, general habits, heatmap filters

Review walkthrough for the habits settings / heatmap work.

## Artifacts

| Artifact | Path |
|----------|------|
| **E2E recording (Obsidian)** | `/opt/cursor/artifacts/atomic-habits-e2e-user-journey.mp4` |
| Demo vault | `/workspace/obsidian-demo` (plugin installed under `.obsidian/plugins/obsidian-atomic/`) |
| Click-through mockup | [`docs/mockups/atomic/07-habits-user-journey.html`](./mockups/atomic/07-habits-user-journey.html) |
| Settings mockup | [`docs/mockups/atomic/01-settings.html`](./mockups/atomic/01-settings.html) |
| Earlier mockup recording | `/opt/cursor/artifacts/habits-user-journey.mp4` |
| Settings screenshot | [`docs/images/07-settings-atomic.png`](./images/07-settings-atomic.png) |
| Heatmap filter screenshot | [`docs/images/atomic-heatmap-activity-filter.png`](./images/atomic-heatmap-activity-filter.png) |

## Journey steps

1. **One color per habit** — Open Settings → Atomic. Each exercise/hobby has enable, label, folder, Delete, and a single color picker. Four heatmap shades appear as swatches.
2. **General habits** — Reading is listed under General habits (not hard-forced). Add Chess (or another name). Disable or delete without removing vault notes.
3. **Heatmap filter** — In a note, set `atomic-heatmap` to `activity: all` (default), one id (`reading`), or a list (`gym, golf, chess`).
4. **Rendered heatmaps** — Only the requested enabled habits render, each with its own palette.
5. **Disable path** — Turn Reading off. Commands Notice; `activity: reading` shows an inline unknown/disabled message.

## E2E checklist (run in `/workspace/obsidian-demo`)

1. Confirm color picker + shade swatches on Gym/Golf/Reading.
2. Add a general habit (e.g. Chess), create an item with **New hobby item**, start/stop the timer.
3. Confirm Dashboard heatmaps for all / `activity: reading` / `activity: gym, golf`.
4. Open Book Shelf; disable Reading and confirm Reading commands Notice; re-enable.
