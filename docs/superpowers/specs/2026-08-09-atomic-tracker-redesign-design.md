# Design: Atomic habit tracker redesign

Date: 2026-08-09  
Status: proposed (awaiting approval)  
Related: language selection is a **separate** PR/spec (`2026-08-09-i18n-language-selection-design.md`)

## Goal

Reposition the Fitness plugin as **Atomic**: a vault-native habit tracker that makes habits last by visualizing them.

Convert today’s gym/golf fitness tracker into:

1. **Exercise tracker** — defaults Golf + Gym; users add their own exercises (running, badminton, …); keep cues + dashboard for sports/exercise
2. **General (hobby) tracker** — default Reading; users add hobby types; per-item remarks/notes; start/stop time tracking on item notes; notes stay normal markdown so they drop onto Obsidian Canvas. **No cues** in the general tracker

Tagline intent: *visualize habits so they stick* (Atomic Habits–inspired naming; not affiliated).

## Decomposition (multiple PRs after approval)

This is too large for one implementation PR. After this design is approved:

| Phase PR | Deliverable | Depends on |
|----------|-------------|------------|
| **I18n** (already separate design PR) | Language dropdown + catalogs | none |
| **A — Rebrand shell** | Manifest/name/CSS/docs → Atomic; `atomic-*` codeblocks with `fitness-*` aliases | none (can parallel i18n) |
| **B — Exercise generalization** | Custom exercise types in Settings; generic session templates; cues for any exercise series that opts in | A |
| **C — Hobby tracker** | Reading default; item notes; remarks; timer start/stop; hobby heatmaps/dashboard section; Canvas-friendly links | A |
| **D — Docs + verification** | USER_GUIDE/README/AGENTS screenshots-when-possible; full unit/security suite; manual E2E checklist | B + C |

Parallelization after A lands: B and C can run as parallel agents on separate branches if interfaces from A are stable.

## Assumptions (correct if wrong)

| Topic | Assumption |
|-------|------------|
| Plugin display name | **Atomic** |
| Plugin id / install folder | Rename `obsidian-fitness` → `obsidian-atomic`. Pre-community-browser plugin, so id change is acceptable with a one-release migration note |
| Repo name | Keep GitHub repo `fitness-plugin` for now; document install path change. Optional later rename |
| Spelling | Product name is **Atomic** (not “Automic”) |
| Exercise vs hobby | Two **domains** under one plugin: `exercise` and `hobby` |
| Exercise defaults | Gym + Golf remain; both keep cues |
| Custom exercise | User-defined series under Exercise (folder + label + color + `supportsCues: true`) |
| Hobby default | Reading |
| Hobby cues | None (no cue rollup, no Reminders scrape) |
| Reading model | **Item-centric** (one note per book/activity instance), not one note per calendar day |
| Timer | Start/Stop on the item note; append time-log entries; roll minutes into heatmaps |
| Canvas | Do not build a custom canvas. Item/session notes are ordinary vault notes + wikilinks so users place them on Canvas |
| Legacy fitness blocks | Keep `fitness-*` processors as aliases until a migrate toggle/button turns them off (same pattern as `fitness-cues`) |
| Existing gym/golf notes | Keep working under same folder defaults (`Gym/`, `Golf/`) unless user migrates paths |

## Approaches considered

### Approach 1 — Capability-flagged activity types (recommended)

One `ActivityType` model:

```ts
type Domain = "exercise" | "hobby";

interface ActivityType {
  id: string;
  domain: Domain;
  label: string;
  folder: string;
  colors: [string, string, string, string];
  // exercise session-day notes vs hobby item notes
  noteModel: "dailySession" | "item";
  supportsCues: boolean;      // exercise default true; hobby always false
  supportsTimer: boolean;     // hobby items default true; exercise optional later
  supportsSetTable: boolean;  // gym-like templates only
}
```

Shared shell: heatmaps, today strip, dashboard, settings CRUD, live refresh.  
Domain-specific: templates, parsers, cue rollup (exercise only), timer UI (hobby items).

- Pros: matches “one plugin, two trackers”; testable pure core; Settings can add types without code changes
- Cons: needs a careful migration from today’s `SeriesKind = gym | golf | generic`

### Approach 2 — Two almost-separate plugins in one bundle

`ExercisePluginFace` + `HobbyPluginFace` with duplicated codeblock prefixes.

- Pros: hard isolation
- Cons: double settings, double dashboards, fights “Atomic” as one habit system

### Approach 3 — Minimal series tweak only

Keep daily session notes for everything; stuffing books into `Reading/2026/2026-08-09.md`.

- Pros: smallest code delta
- Cons: fails the book/timer/remarks model the brief asked for

**Recommendation:** Approach 1.

## Product surfaces

### Settings (mockup: `docs/mockups/atomic/01-settings.html`)

Sections:

1. **Language** — owned by i18n PR; Atomic PR only reserves the slot
2. **Timezone**
3. **Dashboard path** (default `Atomic/Dashboard.md`, migrate from `Fitness/Dashboard.md` if old path exists and new missing)
4. **Exercise types** — list with Add / Rename / Folder / Colors / Cues on-off
5. **Hobby types** — list with Add / Rename / Folder / Colors (no cues toggle)
6. **Legacy** — Allow `fitness-*` block aliases; Migrate button

### Exercise tracker (mockup: `docs/mockups/atomic/02-exercise-dashboard.html`)

Keeps today’s strengths:

- Year heatmaps per exercise type
- Today’s sessions
- Yearly dashboard (duration, volume when set-table exists, golf focus/felt when present)
- Cue rollups per exercise type that has `supportsCues`
- Commands: New session for each exercise type (or picker)

Custom exercise (e.g. Running):

- Daily session note under `Exercise/Running/YYYY/YYYY-MM-DD.md` (or top-level `Running/` if user prefers; default nest under `Exercise/` for new types only; Gym/Golf keep current roots for compatibility)
- Template: frontmatter + optional notes + `## Reminders` when cues enabled
- No set table unless `supportsSetTable` (Gym only by default)

### Hobby tracker (mockups: `docs/mockups/atomic/03-hobby-item-note.html`, `04-canvas.html`)

Default Reading:

```text
Hobbies/Reading/
  Library.md          # optional index with atomic-hobby-library block
  Items/
    Atomic Habits.md  # item note
```

Item note responsibilities:

- Frontmatter: `type: atomic-item`, `domain: hobby`, `activity: reading`, `status`, `total_min`, optional `canvas` wikilink targets
- Body: user remarks / chapter notes (free markdown)
- Codeblock `atomic-timer` — Start / Stop / show open interval + total
- Time log section appended by the timer (machine-readable, human-visible)

Timer behavior:

1. Start → write `timer_started_at` ISO timestamp to frontmatter (or plugin memory + immediate frontmatter write)
2. Stop → compute minutes, clear `timer_started_at`, add `total_min`, append log line `- YYYY-MM-DD HH:mm–HH:mm · N min — optional note`
3. Crash safety: on plugin load, if `timer_started_at` is set, show Resume/Discard in the timer block
4. Heatmap minutes come from log entries’ dates, not only from `total_min`

Canvas:

- Item notes are normal files → user opens Canvas and drags `[[Atomic Habits]]` onto it
- Optional frontmatter `related_canvas: "[[Habits Canvas]]"` for dashboard links only
- Command: **Atomic: Copy wikilink** / document in USER_GUIDE — no proprietary canvas format

### Codeblocks

| New language | Role | Legacy alias |
|--------------|------|--------------|
| `atomic-heatmap` | Heatmaps for configured types | `fitness-heatmap` |
| `atomic-today` | Today strip | `fitness-today` |
| `atomic-dashboard` | Combined exercise + hobby stats | `fitness-dashboard` |
| `atomic-actions` | Quick create buttons | `fitness-actions` |
| `atomic-cues` | Cue rollup; args `activity: golf` etc. | `fitness-golf-cues`, `fitness-gym-cues`, `fitness-cues` |
| `atomic-timer` | Start/stop on item notes | — |
| `atomic-hobby-library` | List items for a hobby type | — |

### Core modules (target shape)

Keep Obsidian-free logic testable:

| Module | Responsibility |
|--------|----------------|
| `src/core/exercise.ts` | set tables, volume, cues (moved from `core.ts`) |
| `src/core/hobby.ts` | timer math, time-log parse/append, item totals |
| `src/core/heatmap.ts` | duration → level shared |
| `src/i18n/` | from i18n PR |
| `src/types.ts` | `ActivityType`, settings |
| `src/data/vault-source.ts` | list sessions + list items |
| `src/views/*` | renderers |
| `src/util/migrate-*.ts` | fence rewrites, dashboard path migrate |

## Data migration

1. Settings: map old `series[]` → `activityTypes[]` with `domain: "exercise"`, preserve gym/golf folders
2. `dashboardPath`: if stored value is `Fitness/Dashboard.md` and file exists, keep reading it until user migrates; Settings button **Move dashboard to Atomic/** optional
3. Codeblocks: Migrate button rewrites `fitness-*` → `atomic-*` (and cue specifics → `atomic-cues` with activity arg, or keep dedicated `atomic-golf-cues` aliases — **decision:** keep dedicated aliases `atomic-golf-cues` / `atomic-gym-cues` plus generic `atomic-cues` for custom exercises)
4. Plugin folder: release notes tell users to install `obsidian-atomic` and disable `obsidian-fitness`; provide settings export sameness via copied `data.json` keys where possible

## Security

Extend existing vault-path hardening:

- All user-defined folders pass `isSafeVaultFolder` (no `..`, no absolute paths, no `.obsidian`)
- Timer writes only to the active item note path already open/validated
- YAML scalars stay escaped via `yamlScalar`
- No network calls; no remote scripts
- Canvas links are wikilinks only, not shell/file URLs
- Security tests expand for new folder fields and timer log injection (bullets must not break out of list formatting)

## Testing strategy

| Kind | Where | Notes |
|------|-------|-------|
| Unit | `tests/*.mjs` | core exercise, hobby timer/log, merge/migrate, security |
| Typecheck / build | CI + local | required every PR |
| Security review | `tests/security.test.mjs` + human/security-review agent on each phase PR | path traversal, yaml, log injection |
| Manual E2E (Obsidian when available) | checklist below | Cloud VM: skip GUI, state so in PR |
| Multi-agent | After plan approval: parallel agents for B vs C; sequential for A then D | |

### Manual E2E checklist (Obsidian)

1. Enable Atomic; confirm old Fitness folder plugin disabled or migrated
2. Open dashboard; heatmaps for Gym + Golf still populate from existing notes
3. Add exercise type “Running”; create session; confirm heatmap cell
4. Open gym/golf cues; confirm rollups
5. Add hobby type already default Reading; create book item; write remarks
6. Start/Stop timer; confirm `total_min` + log line; heatmap minutes update
7. Drag item note onto a Canvas; confirm wikilink works
8. Run legacy migrate; confirm `fitness-*` fences rewritten and alias toggle off

## Docs updates (phase D + each PR as needed)

- `README.md` — Atomic positioning, install path `obsidian-atomic`
- `docs/USER_GUIDE.md` — exercise + hobby layouts, timer, canvas, migration from Fitness
- `AGENTS.md` — new test expectations, plugin id, domain boundaries
- `docs/mockups/atomic/*` — keep as design references
- Screenshots only when Obsidian available (Light, fullscreen, readable line length off)

## High-level task breakdown (for writing-plans after approval)

### Phase A — Rebrand shell

1. Rename manifest/package display strings to Atomic; id `obsidian-atomic`
2. Register `atomic-*` codeblocks; keep `fitness-*` aliases behind flag
3. CSS class root `atomic-plugin` (accept both during transition)
4. Update release zip `PLUGIN_ID`
5. Docs pass for rename; unit tests for alias registration helpers

### Phase B — Exercise generalization

1. Replace `SeriesKind` with `ActivityType` (`domain: exercise`)
2. Settings UI: add/edit/remove exercise types
3. Generic daily session template; Gym keeps set table; Golf keeps focus/felt fields via template profile
4. Parameterized cues for any `supportsCues` exercise
5. Commands: new session picker
6. Tests for merge, templates, cues filter by activity id

### Phase C — Hobby tracker

1. Hobby `ActivityType` defaults (Reading)
2. Item note create command + template
3. `atomic-timer` start/stop/resume/discard + pure log parser/appender tests (TDD)
4. Hobby minutes → heatmap series
5. Dashboard hobby section + library block
6. Canvas documentation + optional `related_canvas` link chip
7. Security tests for timer writes / folder safety

### Phase D — Verification & docs

1. Full `npm test` / typecheck / build
2. Security-review agent on diff
3. USER_GUIDE + README + AGENTS
4. Manual E2E if Obsidian present; else explicit skip note
5. Mark design specs approved/implemented

## Open questions for approver

1. Confirm plugin id rename to `obsidian-atomic` (breaks old install folder; needs user move once).
2. Confirm new custom exercises default under `Exercise/<Name>/` while Gym/Golf keep existing root folders.
3. Confirm cue blocks: dedicated `atomic-golf-cues` / `atomic-gym-cues` plus generic `atomic-cues` with `activity:` arg.
4. Confirm hobby heatmaps count timer-log minutes (not pages/chapters).
5. Any other default hobby besides Reading in v1?
