# Atomic

Obsidian plugin for habit tracking under `atomics/**`: gym and golf sessions, Reading item timers, heatmaps, yearly dashboard, golf and gym cue rollups (`atomic-golf-cues`, `atomic-gym-cues`, or `atomic-cues`), and quick creation commands.

**Install:** download `obsidian-atomic-*.zip` from the latest [GitHub Release](https://github.com/justinw0ng/fitness-plugin/releases) and unzip it into `<vault>/.obsidian/plugins/` (so you get `obsidian-atomic/main.js`, `manifest.json`, and `styles.css`).

**Setup guide:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

## Default vault layout

Atomic-created content defaults to:

```text
atomics/
├── Dashboard.md
├── exercise/
│   ├── Gym/
│   │   ├── Cues.md
│   │   └── YYYY/YYYY-MM-DD.md
│   └── Golf/
│       ├── Cues.md
│       └── YYYY/YYYY-MM-DD.md
└── hobbies/
    └── Reading/
        ├── Bookshelf.base
        ├── Book Shelf.md
        └── Items/<Book>.md
```

If you are migrating an existing Fitness vault, use **Settings → Atomic → Migrate from Fitness → Atomic**. It moves the legacy dashboard/Gym/Golf paths when the Atomic destination is empty, rewrites `fitness-*` code fences to `atomic-*`, updates settings, and disables legacy aliases.

## Dashboard

![fitness-dashboard](docs/images/fitness-dashboard.png)

## Quick actions, heatmap, and today

![Quick actions, heatmap, and today's sessions](docs/images/fitness-actions.png)

## Reading hobby tracker

Reading is the built-in hobby activity. Use **Atomic: New reading item** to create `atomics/hobbies/Reading/Items/<Book>.md` with book properties, remarks, a time log, and an `atomic-timer` block. Timer-log minutes feed the Reading heatmap and dashboard hobby summary.

Use **Atomic: Ensure/Open reading bookshelf** to create or open `atomics/hobbies/Reading/Bookshelf.base` for Obsidian Bases Cards and Table views. The Bases core plugin must be enabled for those commands.

Use **Atomic: Ensure/Open book shelf** to create or open `atomics/hobbies/Reading/Book Shelf.md`, which hosts the `atomic-bookshelf` codeblock. The custom shelf uses local CSS 3D hover/focus animation; there is no Framer runtime.
