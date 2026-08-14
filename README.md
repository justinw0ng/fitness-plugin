# Atomic Tracker

Habit tracking in Obsidian. Sessions, reading, heatmaps, one daily note.

**Install from source:**

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/atomic-tracker/`. Optional: `OBSIDIAN_PLUGIN_OUT=/path/to/vault/.obsidian/plugins/atomic-tracker npm run build`.

**Guide:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

![Atomic Tracker on desktop and mobile](docs/images/atomic-daily-hero.gif)

Copy-paste notes: [examples/daily-notes](examples/daily-notes) · [examples/templates](examples/templates) · [examples/dashboard](examples/dashboard)

Daily note template setup: [examples/README.md](examples/README.md#use-the-daily-note-template).

## What it does

- Exercise sessions and custom habits: enable/disable, one color picker → four heatmap shades
- Reading items with timers, book shelf, and Bases bookshelf
- Heatmaps filterable with `activity: …`, optional 2×2 grid (`columns`, `rows`, …)
- Property dropdowns for Reading `status`, golf `felt`/`location`, gym `location`/`weight_unit` (`location` also allows Custom…)

Settings → Atomic Tracker → Language: Traditional Chinese & English (`zh-Hant-en`, default) or English (`en`). Changing language never rewrites existing notes.

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

## Privacy

Atomic Tracker runs locally in your vault. It does not collect telemetry, require an account, or show ads. It does not call home. The only network fetch is if you set a book `cover` to an `http(s):` URL, which Obsidian loads like any other remote image in a note. It reads and writes notes under `atomics/` and any other vault paths you configure (dashboard, activity folders, book covers).

## License

Licensed under the [Apache License 2.0](LICENSE).
