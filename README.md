# Atomic

Obsidian plugin for habit tracking under `atomics/**`: gym and golf sessions, heatmaps, yearly dashboard, golf and gym cue rollups (`atomic-golf-cues`, `atomic-gym-cues`, or `atomic-cues`), and quick session creation.

**Install:** download `obsidian-atomic-*.zip` from the latest [GitHub Release](https://github.com/justinw0ng/fitness-plugin/releases) and unzip it into `<vault>/.obsidian/plugins/` (so you get `obsidian-atomic/main.js`, `manifest.json`, and `styles.css`).

**Setup guide:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

## Default vault layout

Atomic-created content defaults to:

```text
atomics/
├── Dashboard.md
└── exercise/
    ├── Gym/
    │   ├── Cues.md
    │   └── YYYY/YYYY-MM-DD.md
    └── Golf/
        ├── Cues.md
        └── YYYY/YYYY-MM-DD.md
```

If you are migrating an existing Fitness vault, use **Settings → Atomic → Migrate from Fitness → Atomic**. It moves the legacy dashboard/Gym/Golf paths when the Atomic destination is empty, rewrites `fitness-*` code fences to `atomic-*`, updates settings, and disables legacy aliases.

## Dashboard

![fitness-dashboard](docs/images/fitness-dashboard.png)

## Quick actions, heatmap, and today

![Quick actions, heatmap, and today's sessions](docs/images/fitness-actions.png)
