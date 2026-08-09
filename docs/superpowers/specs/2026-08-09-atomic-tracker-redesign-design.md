# Design: Atomic habit tracker redesign

Date: 2026-08-09  
Status: approved  
Related: language selection is a **separate** PR/spec (`2026-08-09-i18n-language-selection-design.md`)

## Goal

Reposition the Fitness plugin as **Atomic**: a vault-native habit tracker that makes habits last by visualizing them.

Convert today’s gym/golf fitness tracker into:

1. **Exercise tracker** — defaults Golf + Gym; users add their own exercises (running, badminton, …); keep cues + dashboard for sports/exercise
2. **General (hobby) tracker** — default Reading; users add hobby types; per-item remarks/notes; start/stop time tracking on item notes; notes stay normal markdown so they drop onto Obsidian Canvas. **No cues** in the general tracker

Tagline intent: *visualize habits so they stick* (Atomic Habits–inspired naming; not affiliated).

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Plugin display name | **Atomic** |
| Plugin id / install folder | `obsidian-atomic` (replaces `obsidian-fitness`) |
| Default vault root | All plugin-created content lives under `atomics/**` unless the user overrides paths in Settings |
| Dashboard default | `atomics/Dashboard.md` |
| Exercise defaults | `atomics/exercise/Gym/`, `atomics/exercise/Golf/` (sessions + cues) |
| Custom exercise default folder | `atomics/exercise/<Name>/` when created via the plugin |
| Hobby default | Reading at `atomics/hobbies/Reading/` |
| Custom hobby default folder | `atomics/hobbies/<Name>/` when created via the plugin |
| Fitness → Atomic vault migrate | **One-click** Settings button (files + settings + codeblock fences) |
| Migrate conflicts | If destination already exists, **skip** that item (no merge/overwrite) |
| Cue blocks | Dedicated `atomic-golf-cues` / `atomic-gym-cues` **plus** generic `atomic-cues` (`activity:` arg) |
| Hobby cues | None |
| Hobby heatmaps | Minutes from **timer-log entries** (not pages/chapters) |
| Default hobbies v1 | Reading only (no other built-in hobbies for now) |
| Canvas | Ordinary vault notes + wikilinks; no custom canvas format |
| Legacy codeblocks | `fitness-*` aliases until migrate turns them off |
| Cue blocks | Dedicated `atomic-golf-cues` / `atomic-gym-cues`, plus generic `atomic-cues` with `activity:` arg |
| Hobby heatmap source | Timer-log minutes (not pages/chapters) |
| Default hobbies (v1) | Reading only (no extra defaults for now) |
| Migrate destination conflict | Skip only when destination exists; no merge of leftover source files |

## Decomposition (multiple PRs after approval)

| Phase PR | Deliverable | Depends on |
|----------|-------------|------------|
| **I18n** (separate design PR) | Language dropdown + catalogs | none |
| **A — Rebrand shell** | Manifest → Atomic / `obsidian-atomic`; `atomic-*` blocks + `fitness-*` aliases; default paths under `atomics/**` | none (can parallel i18n) |
| **B — Exercise generalization** | Custom exercise types; cues for opted-in exercise series | A |
| **C — Hobby tracker** | Reading; item notes; timer; hobby heatmaps; Canvas-friendly links | A |
| **D — Docs + verification** | USER_GUIDE/README/AGENTS; unit/security; E2E checklist | B + C |

One-click Fitness migration ships in **A** (paths + fences + settings) and is extended in **B/C** if new path keys appear.

## Default vault layout

When the user has not overridden paths, and content is created through the plugin:

```text
atomics/
├── Dashboard.md
├── exercise/
│   ├── Gym/
│   │   ├── Cues.md
│   │   └── YYYY/YYYY-MM-DD.md
│   ├── Golf/
│   │   ├── Cues.md
│   │   └── YYYY/YYYY-MM-DD.md
│   └── Running/                    # example custom exercise
│       ├── Cues.md                 # if supportsCues
│       └── YYYY/YYYY-MM-DD.md
└── hobbies/
    └── Reading/
        ├── Library.md              # optional index block
        └── Items/
            └── Atomic Habits.md    # item note + timer
```

Rules:

1. Plugin-created notes and folders always resolve under `atomics/**` by default.
2. If the user sets a custom folder/path in Settings, honor that path (still must pass `isSafeVaultFolder` / path safety checks).
3. Do not invent files outside `atomics/` unless the user opted into a custom path.

## Approaches considered

### Approach 1 — Capability-flagged activity types (recommended)

```ts
type Domain = "exercise" | "hobby";

interface ActivityType {
  id: string;
  domain: Domain;
  label: string;
  folder: string; // default under atomics/exercise|hobbies/...
  colors: [string, string, string, string];
  noteModel: "dailySession" | "item";
  supportsCues: boolean;      // exercise default true; hobby always false
  supportsTimer: boolean;     // hobby items default true
  supportsSetTable: boolean;  // gym-like templates only
}
```

Shared shell: heatmaps, today strip, dashboard, settings CRUD, live refresh, migration.  
Domain-specific: templates, parsers, cue rollup (exercise only), timer UI (hobby items).

### Approach 2 — Two almost-separate plugins in one bundle

Hard isolation, duplicated settings/dashboards. Rejected.

### Approach 3 — Keep daily session notes for hobbies

Fails book/timer/remarks model. Rejected.

**Recommendation:** Approach 1.

## Product surfaces

### Settings (mockup: `docs/mockups/atomic/01-settings.html`)

1. **Language** — i18n PR owns implementation; Atomic reserves the row
2. **Timezone**
3. **Dashboard path** — default `atomics/Dashboard.md`
4. **Exercise types** — Add / Rename / Folder / Colors / Cues on-off (new folders default under `atomics/exercise/`)
5. **Hobby types** — Add / Rename / Folder / Colors (new folders default under `atomics/hobbies/`; no cues)
6. **Migrate from Fitness** — one-click full migration (see below)
7. **Legacy** — Allow `fitness-*` aliases (turned off by successful migrate)

### Exercise tracker (mockup: `docs/mockups/atomic/02-exercise-dashboard.html`)

- Year heatmaps per exercise type
- Today’s sessions
- Yearly dashboard (duration, volume when set-table exists, golf focus/felt when present)
- Cue rollups per exercise type with `supportsCues`
- Commands: New session per type or picker
- Custom exercise daily notes under `atomics/exercise/<Name>/YYYY/YYYY-MM-DD.md` by default
- Gym keeps set table via `supportsSetTable`; others get a simpler session template + Reminders when cues enabled

### Hobby tracker (mockups: `docs/mockups/atomic/03-hobby-item-note.html`, `04-canvas.html`)

Default Reading under `atomics/hobbies/Reading/`.

Item note:

- Frontmatter: `type: atomic-item`, `domain: hobby`, `activity: reading`, `status`, `total_min`, optional `related_canvas`
- Body: remarks / chapter notes
- `atomic-timer` Start / Stop / Resume / Discard
- Time log bullets appended by the timer

Timer:

1. Start → set `timer_started_at`
2. Stop → clear start, bump `total_min`, append log line
3. On load with open timer → Resume/Discard UI
4. Heatmap minutes from log entry dates

Canvas: drag item notes onto Obsidian Canvas or paste wikilinks. No proprietary format.

### Codeblocks

| New language | Role | Legacy alias |
|--------------|------|--------------|
| `atomic-heatmap` | Heatmaps | `fitness-heatmap` |
| `atomic-today` | Today strip | `fitness-today` |
| `atomic-dashboard` | Combined stats | `fitness-dashboard` |
| `atomic-actions` | Quick create | `fitness-actions` |
| `atomic-golf-cues` / `atomic-gym-cues` | Dedicated cue rollups | `fitness-golf-cues` / `fitness-gym-cues` / `fitness-cues` |
| `atomic-cues` | Generic cues with `activity:` arg | — |
| `atomic-timer` | Item Start/Stop | — |
| `atomic-hobby-library` | Hobby item list | — |

## One-click migration from Fitness

Settings button label: **Migrate from Fitness → Atomic**

Runs as a single idempotent action. Pure planning/apply helpers live in Obsidian-free modules and are unit-tested.

### What it migrates

| From (current design) | To (Atomic defaults) |
|-----------------------|----------------------|
| `Fitness/Dashboard.md` | `atomics/Dashboard.md` |
| `Gym/**` | `atomics/exercise/Gym/**` |
| `Golf/**` | `atomics/exercise/Golf/**` |
| `Gym/Cues.md` / `Golf/Cues.md` | move with their folders |
| Settings `dashboardPath`, series folders, cue paths | updated to `atomics/**` targets |
| Fenced `fitness-*` codeblocks | `atomic-*` equivalents |
| `deprecatedFitnessCuesEnabled` / fitness alias flag | set `false` after successful rewrite |

### Algorithm

1. Build a migration plan (list of renames + fence rewrites + settings patch). No writes yet.
2. Validate every source/destination with existing path safety helpers. Refuse `.obsidian`, `..`, absolute paths.
3. Apply folder/file renames with vault adapter APIs (prefer move over copy). If destination already exists, **skip that item** and record it; do not overwrite user data.
4. Scan markdown notes; rewrite top-level fences:
   - `fitness-heatmap` → `atomic-heatmap`
   - `fitness-today` → `atomic-today`
   - `fitness-dashboard` → `atomic-dashboard`
   - `fitness-actions` → `atomic-actions`
   - `fitness-golf-cues` / `fitness-cues` → `atomic-golf-cues`
   - `fitness-gym-cues` → `atomic-gym-cues`
5. Patch settings to Atomic defaults for any keys still pointing at pre-migration paths that were moved.
6. Disable legacy `fitness-*` alias support.
7. Notice: moved N paths, skipped M (already present), rewrote B blocks in F files.

Idempotent: second click reports zero moves / zero rewrites when already migrated.

### What it does not do

- Does not delete the old plugin folder under `.obsidian/plugins/obsidian-fitness` (user removes/disables that install)
- Does not rewrite prose that merely mentions the string `fitness-heatmap`
- Does not move unrelated vault folders

## Core modules (target shape)

| Module | Responsibility |
|--------|----------------|
| `src/core/exercise.ts` | set tables, volume, cues |
| `src/core/hobby.ts` | timer math, time-log parse/append |
| `src/core/heatmap.ts` | duration → level |
| `src/i18n/` | from i18n PR |
| `src/types.ts` | `ActivityType`, settings defaults under `atomics/**` |
| `src/data/vault-source.ts` | list sessions + items |
| `src/views/*` | renderers |
| `src/util/migrate-fitness.ts` | one-click plan + fence rewrite + settings patch |
| `src/util/vault-path.ts` | safety checks (extended for `atomics/` defaults) |

## Security

- User-defined folders pass `isSafeVaultFolder`
- Migration only moves paths inside the vault and inside the planned source→dest map
- Timer writes only to the validated item note
- `yamlScalar` for frontmatter writes
- No network / no remote scripts
- Canvas values are wikilinks only
- Tests cover traversal attempts, overwrite skips, and time-log injection

## Testing strategy

| Kind | What |
|------|------|
| Unit | exercise/hobby core, migrate plan/apply pure helpers, fence rewrite, settings merge, security |
| Typecheck / build | required every PR |
| Security review | agent + `tests/security.test.mjs` on each phase |
| Manual E2E | checklist below when Obsidian available; Cloud VM skips GUI |

### Manual E2E checklist

1. Fresh Atomic install; create dashboard/session via plugin → all under `atomics/**`
2. On a Fitness-layout vault, click **Migrate from Fitness → Atomic**; confirm moves + settings + fences
3. Re-run migrate; confirm idempotent zero-change Notice
4. Gym/Golf heatmaps and cues work from new paths
5. Add Running under exercise; note lands in `atomics/exercise/Running/`
6. Reading item + timer + remarks; Canvas drag works
7. Legacy `fitness-*` no longer required after migrate

## Docs updates

- `README.md` — Atomic, install `obsidian-atomic`, `atomics/**` layout
- `docs/USER_GUIDE.md` — domains, defaults, one-click migrate, timer, canvas
- `AGENTS.md` — plugin id, `atomics/**` defaults, test expectations
- Mockups under `docs/mockups/atomic/`

## High-level task breakdown

### Phase A — Rebrand + `atomics/**` + one-click migrate

1. Manifest/package → Atomic; id `obsidian-atomic`
2. Default settings paths under `atomics/**`
3. `atomic-*` codeblocks + `fitness-*` aliases
4. One-click migrate helper + Settings button + tests
5. Release `PLUGIN_ID` + README install path

### Phase B — Exercise generalization

1. `ActivityType` exercise domain
2. Settings CRUD; defaults under `atomics/exercise/`
3. Templates + parameterized cues
4. Session picker commands
5. Tests

### Phase C — Hobby tracker

1. Reading default under `atomics/hobbies/Reading/`
2. Item notes + timer (TDD)
3. Hobby heatmap/dashboard/library
4. Canvas docs + optional `related_canvas`
5. Security tests

### Phase D — Verification & docs

1. Full test/typecheck/build
2. Security-review agent
3. USER_GUIDE / README / AGENTS
4. E2E or explicit Cloud skip
5. Mark specs implemented

## Approval notes (2026-08-09)

Product questions closed by approver:

1. Keep dedicated `atomic-golf-cues` / `atomic-gym-cues` plus generic `atomic-cues`.
2. Hobby heatmaps use timer-log minutes.
3. No additional default hobbies beyond Reading for now.
4. Migrate skips when destination exists (no merge).

No open product questions remain. Next step: writing-plans → multi-agent implementation.
