# User journey — base colors, general habits, heatmap filters

Review walkthrough for the habits settings / heatmap work. Obsidian desktop was not available in the docs VM, so this journey uses HTML mockups that mirror the shipped settings UX.

## Artifacts

| Artifact | Path |
|----------|------|
| Click-through mockup | [`docs/mockups/atomic/07-habits-user-journey.html`](./mockups/atomic/07-habits-user-journey.html) |
| Settings mockup | [`docs/mockups/atomic/01-settings.html`](./mockups/atomic/01-settings.html) |
| Recorded journey | `/opt/cursor/artifacts/habits-user-journey.mp4` (attached on the PR) |
| Settings screenshot | [`docs/images/07-settings-atomic.png`](./images/07-settings-atomic.png) |
| Heatmap filter screenshot | [`docs/images/atomic-heatmap-activity-filter.png`](./images/atomic-heatmap-activity-filter.png) |

## Journey steps

1. **One color per habit** — Open Settings → Atomic. Each exercise/hobby has enable, label, folder, Delete, and a single color picker. Four heatmap shades appear as swatches.
2. **General habits** — Reading is listed under General habits (not hard-forced). Add Chess (or another name). Disable or delete without removing vault notes.
3. **Heatmap filter** — In a note, set `atomic-heatmap` to `activity: all` (default), one id (`reading`), or a list (`gym, golf, chess`).
4. **Rendered heatmaps** — Only the requested enabled habits render, each with its own palette.
5. **Disable path** — Turn Reading off. Commands Notice; `activity: reading` shows an inline unknown/disabled message.

## Live Obsidian checklist (when desktop is available)

1. Confirm the color picker + swatches match the mockup.
2. Add a general habit, create an item with **New hobby item**, start/stop the timer.
3. Confirm `activity: gym, reading` on a dashboard note.
4. Disable Reading and confirm Reading commands Notice.
