# Atomic

Obsidian plugin for habit tracking under `atomics/**`: exercise sessions (Gym/Golf plus custom types), general habits with item timers (Reading by default), heatmaps, yearly dashboard, golf and gym cue rollups (`atomic-golf-cues`, `atomic-gym-cues`, or `atomic-cues`), and quick creation commands.

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

## Exercise + general habits

In **Settings → Atomic**, each exercise and general habit has enable/disable, delete, and a **single color picker** (four heatmap shades are generated for you). Disabled habits leave vault notes alone but drop out of heatmaps, dashboard, and commands.

## Reading and other general habits

Reading is the default general habit (item + timer). Use **Atomic: New reading item** or **Atomic: New hobby item** for `atomics/hobbies/<Name>/Items/<Title>.md` with properties, remarks, a time log, and an `atomic-timer` block. Timer-log minutes feed heatmaps and the dashboard hobby summary.

`atomic-heatmap` defaults to all enabled habits. Filter with `activity: reading` or `activity: gym, golf`. For multiple activities, optional grid layout uses `columns`, `rows`, `min-column-width`, and `default-span` (see `docs/USER_GUIDE.md`); `columns: 1` keeps the vertical stack.

`atomic-actions` shows a button for every enabled habit (exercise sessions + general-habit items).

Use **Atomic: Create Obsidian bases of reading notes** / **Open Obsidian bases of reading notes** for `Bookshelf.base` (Obsidian Bases Cards + Table). Bases must be enabled for those commands.

Use **Atomic: Create/Open book shelf** for `Book Shelf.md` (`atomic-bookshelf`). The shelf uses local CSS 3D hover; no Framer runtime. Cover images accept vault wikilinks, paths, or URLs. Filter the shelf with `status: reading` (or comma-separated status ids); omit `status` to show all books.

Reading item notes get **property dropdowns** for `status` in Properties and Bases. Golf sessions get dropdowns for `felt` and `location`; gym sessions for `location` and `weight_unit`.
