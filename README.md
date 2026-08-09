# Atomic

Obsidian plugin for habit tracking under `atomics/**`: gym and golf sessions, Reading item timers, heatmaps, yearly dashboard, golf and gym cue rollups (`atomic-golf-cues`, `atomic-gym-cues`, or `atomic-cues`), and quick creation commands.

Settings → Atomic → Language has two UI modes: Traditional Chinese & English (`zh-Hant-en`, default) and English (`en`). No Simplified Chinese. Changing language never rewrites existing notes.

**Install:** download `obsidian-atomic-*.zip` from the latest [GitHub Release](https://github.com/justinw0ng/obsidian-atomic/releases) and unzip into `<vault>/.obsidian/plugins/` (so you get `obsidian-atomic/main.js`, `manifest.json`, and `styles.css`).

**Setup guide (including Fitness → Atomic upgrade):** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

## Default vault layout

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
        ├── Covers/
        └── Items/<Book>.md
```

## Upgrade from Fitness

Use **Settings → Atomic → Migrate from Fitness to Atomic**. It moves the legacy dashboard/Gym/Golf paths when the Atomic destination is empty, rewrites `fitness-*` code fences to `atomic-*`, updates settings, and disables legacy aliases. Details: [docs/USER_GUIDE.md#upgrade-from-fitness](docs/USER_GUIDE.md#upgrade-from-fitness).

## Dashboard

![Dashboard](docs/images/atomic-dashboard.png)

## Quick actions, heatmap, and today

![Quick actions, heatmap, and today's sessions](docs/images/atomic-actions.png)

## Book shelf

![Book shelf](docs/images/atomic-book-shelf.png)

## Reading hobby tracker

Reading is the built-in hobby. Use **Atomic: New reading item** for `atomics/hobbies/Reading/Items/<Book>.md` with book properties, remarks, a time log, and an `atomic-timer` block. Timer-log minutes feed the Reading heatmap and dashboard hobby summary.

Use **Atomic: Ensure/Open reading bookshelf** for `Bookshelf.base` (Obsidian Bases Cards + Table). Bases must be enabled for those commands.

Use **Atomic: Ensure/Open book shelf** for `Book Shelf.md` (`atomic-bookshelf`). The shelf uses local CSS 3D hover; no Framer runtime. Cover images accept vault wikilinks, paths, or URLs.
