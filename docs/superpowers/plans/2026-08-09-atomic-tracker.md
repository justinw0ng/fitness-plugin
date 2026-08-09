# Atomic tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand Fitness to Atomic (`obsidian-atomic`), default all plugin-created content under `atomics/**`, ship one-click Fitness→Atomic migration, then generalize exercise types and add a Reading hobby tracker with timers (no hobby cues).

**Architecture:** Capability-flagged `ActivityType` model (`domain: exercise | hobby`) shared by heatmaps/dashboard/settings. Phase A lands id/paths/aliases/migrate. Phase B generalizes exercise. Phase C adds item notes + `atomic-timer` (heatmap minutes from timer logs). Pure migrate/timer/cue logic stays Obsidian-free for Node tests.

**Tech Stack:** TypeScript, Obsidian plugin APIs, Node test runner (`npm test`), esbuild, existing vault-path security helpers.

## Global Constraints

- Plugin id / install folder: `obsidian-atomic`
- Default vault root: `atomics/**` when paths are not overridden and content is created via the plugin
- Dashboard default: `atomics/Dashboard.md`
- Exercise defaults: `atomics/exercise/Gym`, `atomics/exercise/Golf`; custom → `atomics/exercise/<Name>`
- Hobby default: Reading at `atomics/hobbies/Reading` only (no other built-in hobbies)
- Cue blocks: dedicated `atomic-golf-cues` / `atomic-gym-cues` **plus** generic `atomic-cues`
- Hobby heatmaps: timer-log minutes
- Reading bookshelf: Obsidian Bases `.base` file (Cards + Table), created/opened **on demand** by plugin commands — not a custom gallery UI
- Bookshelf path: `atomics/hobbies/Reading/Bookshelf.base`; soft-require Bases core plugin (Notice if off)
- Book properties for Bases: `cover`, `authors`, `description`, `pages`, `status`, `tags` (+ existing timer fields)
- Migrate conflicts: skip destination if it already exists (no merge/overwrite)
- One-click Settings migrate: folders + fences + settings + disable legacy aliases; idempotent
- Keep `fitness-*` aliases until migrate turns them off
- Language selection is a separate PR/plan; reserve Settings Language row only if i18n not merged yet
- Every phase: `npm test`, `npm run typecheck`, `npm run build` green; `git checkout -- main.js` unless intentionally shipping bundle
- Obsidian GUI E2E: run when available; Cloud VM notes skip

---

## File map (target)

| Path | Responsibility |
|------|----------------|
| `manifest.json`, `package.json`, `.github/workflows/release.yml` | Atomic id/name/`PLUGIN_ID` |
| `src/types.ts` | `ActivityType`, defaults under `atomics/**` |
| `src/util/merge-settings.ts` | migrate old series → activityTypes; path sanitize |
| `src/util/migrate-fitness.ts` | plan + pure fence rewrite + settings patch |
| `src/util/migrate-cues.ts` | keep or fold into migrate-fitness |
| `src/codeblocks.ts` | `atomic-*` processors + `fitness-*` aliases |
| `src/settings.ts` | Migrate button, activity CRUD (B/C), paths |
| `src/core/exercise.ts`, `hobby.ts`, `heatmap.ts` | split from `core.ts` over phases |
| `src/commands/*` | session + item create |
| `src/views/*` | renderers |
| `tests/migrate-fitness.test.mjs`, `tests/hobby-timer.test.mjs`, `tests/security.test.mjs` | coverage |
| `docs/USER_GUIDE.md`, `README.md`, `AGENTS.md` | docs |

---

# Phase A — Rebrand, `atomics/**`, one-click migrate

### Task A1: Manifest / package / release id → `obsidian-atomic`

**Files:**
- Modify: `manifest.json`, `package.json`, `.github/workflows/release.yml`, `README.md` (install path only)

- [ ] **Step 1: Update identity**

`manifest.json`:

```json
{
  "id": "obsidian-atomic",
  "name": "Atomic",
  "description": "Habit tracker for exercise and hobbies — heatmaps, cues, timers, and dashboards under atomics/."
}
```

`package.json` `name` may stay `fitness-plugin` (repo) or become `atomic-plugin`; description must mention Atomic.  
`release.yml` `PLUGIN_ID: obsidian-atomic`.

- [ ] **Step 2: README install path** → `.obsidian/plugins/obsidian-atomic/`

- [ ] **Step 3: Commit**

```bash
git commit -am "chore: rename plugin id to obsidian-atomic"
```

---

### Task A2: Default settings paths under `atomics/**`

**Files:**
- Modify: `src/types.ts`, `src/util/merge-settings.ts`
- Test: `tests/settings-migrate.test.mjs`

**Interfaces:**
- Produces defaults:
  - `dashboardPath: "atomics/Dashboard.md"`
  - Gym folder `atomics/exercise/Gym`, Golf `atomics/exercise/Golf`
  - `gymCuesPath: "atomics/exercise/Gym/Cues.md"`, `golfCuesPath: "atomics/exercise/Golf/Cues.md"`

- [ ] **Step 1: Failing tests**

```js
test("defaults live under atomics/", () => {
  const s = mergeSettings(null);
  assert.equal(s.dashboardPath, "atomics/Dashboard.md");
  assert.equal(s.series.find((x) => x.id === "gym").folder, "atomics/exercise/Gym");
  assert.equal(s.series.find((x) => x.id === "golf").folder, "atomics/exercise/Golf");
  assert.equal(s.gymCuesPath, "atomics/exercise/Gym/Cues.md");
  assert.equal(s.golfCuesPath, "atomics/exercise/Golf/Cues.md");
});
```

- [ ] **Step 2: Run — expect FAIL on old `Fitness/` / `Gym` defaults**

- [ ] **Step 3: Update `DEFAULT_SETTINGS`**; keep merge accepting legacy stored folders (do not force-rewrite until migrate button)

- [ ] **Step 4: `npm test` PASS → commit**

```bash
git commit -am "feat: default vault paths under atomics/"
```

---

### Task A3: Register `atomic-*` codeblocks + `fitness-*` aliases

**Files:**
- Modify: `src/codeblocks.ts`, `src/types.ts` (alias flag; reuse/extend `deprecatedFitnessCuesEnabled` or add `deprecatedFitnessBlocksEnabled` default `true`)
- Test: prefer pure helper listing registered kinds if extracted; otherwise document manual + keep cue rewrite tests green

**Interfaces:**
- Always register: `atomic-heatmap`, `atomic-today`, `atomic-dashboard`, `atomic-actions`, `atomic-golf-cues`, `atomic-gym-cues`, `atomic-cues`
- While legacy enabled: also `fitness-heatmap`, `fitness-today`, `fitness-dashboard`, `fitness-actions`, `fitness-golf-cues`, `fitness-gym-cues`, and `fitness-cues` → golf cues

- [ ] **Step 1: Map legacy kinds to renderers** (same view functions)

- [ ] **Step 2: `atomic-cues` reads activity from info string / YAML body** (`activity: golf|gym|<id>`); dedicated golf/gym kinds force activity

- [ ] **Step 3: typecheck + test + commit**

```bash
git commit -am "feat: register atomic-* codeblocks with fitness-* aliases"
```

---

### Task A4: Pure migrate plan + fence rewrite

**Files:**
- Create: `src/util/migrate-fitness.ts`
- Test: `tests/migrate-fitness.test.mjs`

**Interfaces:**

```ts
export type MigrateMove = { from: string; to: string };
export type MigratePlan = {
  moves: MigrateMove[];
  settingsPatch: Partial<FitnessSettings>;
};

export function planFitnessMigration(input: {
  existingPaths: Set<string>; // vault-relative paths or folder prefixes present
  settings: FitnessSettings;
}): MigratePlan;

export function rewriteFitnessFences(markdown: string): {
  markdown: string;
  replacements: number;
};
```

Fence map:

| from | to |
|------|-----|
| `fitness-heatmap` | `atomic-heatmap` |
| `fitness-today` | `atomic-today` |
| `fitness-dashboard` | `atomic-dashboard` |
| `fitness-actions` | `atomic-actions` |
| `fitness-golf-cues` | `atomic-golf-cues` |
| `fitness-cues` | `atomic-golf-cues` |
| `fitness-gym-cues` | `atomic-gym-cues` |

Default moves (only if source exists and dest missing):

| from | to |
|------|-----|
| `Fitness/Dashboard.md` | `atomics/Dashboard.md` |
| `Gym` | `atomics/exercise/Gym` |
| `Golf` | `atomics/exercise/Golf` |

Settings patch after planned moves: point `dashboardPath` / series folders / cue paths at Atomic defaults for keys that matched migrated sources. Set legacy alias flag `false` in apply step (settings UI), not necessarily in pure plan.

- [ ] **Step 1: Failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  planFitnessMigration,
  rewriteFitnessFences,
} from "../src/util/migrate-fitness.ts";
import { mergeSettings } from "../src/util/merge-settings.ts";

test("plan moves Gym and Golf when dest missing", () => {
  const plan = planFitnessMigration({
    existingPaths: new Set(["Gym", "Gym/2026/2026-01-01.md", "Golf", "Fitness/Dashboard.md"]),
    settings: mergeSettings({
      dashboardPath: "Fitness/Dashboard.md",
      series: [
        { id: "gym", label: "Gym", folder: "Gym", colors: ["#1","#2","#3","#4"], kind: "gym" },
        { id: "golf", label: "Golf", folder: "Golf", colors: ["#1","#2","#3","#4"], kind: "golf" },
      ],
    }),
  });
  assert.deepEqual(plan.moves, [
    { from: "Fitness/Dashboard.md", to: "atomics/Dashboard.md" },
    { from: "Gym", to: "atomics/exercise/Gym" },
    { from: "Golf", to: "atomics/exercise/Golf" },
  ]);
  assert.equal(plan.settingsPatch.dashboardPath, "atomics/Dashboard.md");
});

test("plan skips when destination exists", () => {
  const plan = planFitnessMigration({
    existingPaths: new Set(["Gym", "atomics/exercise/Gym"]),
    settings: mergeSettings({ series: [{ id: "gym", label: "Gym", folder: "Gym", colors: ["#1","#2","#3","#4"], kind: "gym" }] }),
  });
  assert.equal(plan.moves.find((m) => m.from === "Gym"), undefined);
});

test("rewrite fitness fences to atomic", () => {
  const src = "```fitness-heatmap\n```\n```fitness-cues\n```\n";
  const { markdown, replacements } = rewriteFitnessFences(src);
  assert.equal(replacements, 2);
  assert.match(markdown, /```atomic-heatmap/);
  assert.match(markdown, /```atomic-golf-cues/);
  assert.doesNotMatch(markdown, /```fitness-/);
});

test("rewrite is idempotent for atomic fences", () => {
  const src = "```atomic-heatmap\n```\n";
  assert.equal(rewriteFitnessFences(src).replacements, 0);
});
```

- [ ] **Step 2: Run — FAIL missing module**

- [ ] **Step 3: Implement `planFitnessMigration` + `rewriteFitnessFences`**

Reuse CommonMark fence scanning approach from `migrate-cues.ts` (top-level only, preserve info-string suffix, ignore nested). Reject unsafe paths via `isSafeVaultFolder` for folder moves.

- [ ] **Step 4: `npm test` PASS → commit**

```bash
git commit -am "feat: pure Fitness→Atomic migrate plan and fence rewrite"
```

---

### Task A5: Settings one-click migrate apply + Notices

**Files:**
- Modify: `src/settings.ts`
- Optionally: `src/main.ts` if reload Notice needed for processors

**Interfaces:**
- Button label: **Migrate from Fitness → Atomic**
- Apply: compute `existingPaths` from vault; `planFitnessMigration`; for each move call vault rename/adapter move; scan markdown with `rewriteFitnessFences`; merge `settingsPatch`; set legacy flag false; Notice with moved/skipped/rewritten counts; ask reload if processors need it

- [ ] **Step 1: Implement apply method mirroring `migrateFitnessCuesFences` structure**

- [ ] **Step 2: Keep old cues-only migrate or fold into the new button (prefer single button that does full migrate including fences)**

- [ ] **Step 3: typecheck + test + commit**

```bash
git commit -am "feat: Settings one-click Migrate from Fitness → Atomic"
```

---

### Task A6: Phase A docs + verify

- [ ] Update USER_GUIDE install id + `atomics/**` layout + migrate button
- [ ] Update AGENTS.md plugin id / layout notes
- [ ] `npm test && npm run typecheck && npm run build`
- [ ] Commit docs; open/update Phase A PR

---

# Phase B — Exercise generalization

### Task B1: `ActivityType` model

**Files:** `src/types.ts`, `src/util/merge-settings.ts`, tests

```ts
export type Domain = "exercise" | "hobby";
export interface ActivityType {
  id: string;
  domain: Domain;
  label: string;
  folder: string;
  colors: [string, string, string, string];
  noteModel: "dailySession" | "item";
  supportsCues: boolean;
  supportsTimer: boolean;
  supportsSetTable: boolean;
}
```

- [ ] Map legacy `series` → `activityTypes` (exercise domain) in `mergeSettings`
- [ ] Defaults: Gym (`supportsSetTable` + cues), Golf (cues), folders under `atomics/exercise/`
- [ ] Tests for merge + folder safety
- [ ] Commit

### Task B2: Settings CRUD for exercise types

- [ ] List / add / rename / folder / colors / cues toggle
- [ ] New type default folder `atomics/exercise/<SafeName>`
- [ ] Commit

### Task B3: Templates + commands + parameterized cues

- [ ] Generic daily session template; Gym keeps set table; Golf keeps focus/felt profile
- [ ] Session create uses `activity.folder`
- [ ] `atomic-cues` + dedicated golf/gym kinds
- [ ] Tests for cue filter by activity id
- [ ] Commit

### Task B4: Phase B verify

- [ ] `npm test && npm run typecheck && npm run build` + docs touch

---

# Phase C — Hobby tracker

### Task C1: Reading activity default

- [ ] `activityTypes` includes Reading: `domain: "hobby"`, `folder: "atomics/hobbies/Reading"`, `noteModel: "item"`, `supportsCues: false`, `supportsTimer: true`
- [ ] merge tests
- [ ] Commit

### Task C2: Timer core (TDD)

**Files:** `src/core/hobby.ts`, `tests/hobby-timer.test.mjs`

```ts
export type TimeLogEntry = {
  date: string; // YYYY-MM-DD
  startMin: number; // minutes from midnight optional OR keep ISO strings
  endMin: number;
  minutes: number;
  note: string;
};

export function parseTimeLog(markdown: string): TimeLogEntry[];
export function appendTimeLog(markdown: string, entry: TimeLogEntry): string;
export function stopTimer(input: {
  markdown: string;
  startedAtIso: string;
  stoppedAtIso: string;
  note?: string;
}): { markdown: string; minutes: number; totalMin: number };
export function minutesByDate(entries: TimeLogEntry[]): Map<string, number>;
```

- [ ] Write failing tests for parse/append/stop/idempotent totals
- [ ] Implement minimal hobby timer helpers
- [ ] Commit

### Task C3: Book item note command + `atomic-timer` block

- [ ] Create `atomics/hobbies/Reading/Items/<Name>.md` with Bases-friendly frontmatter: `cover`, `authors`, `description`, `pages`, `status`, `tags`, timer fields
- [ ] Processor Start/Stop/Resume/Discard writing frontmatter + log via core helpers
- [ ] Commit

### Task C4: Obsidian Bases bookshelf (on demand)

**Files:**
- Create: `src/hobbies/reading-bookshelf.ts` (template string + ensure/open helpers)
- Test: `tests/reading-bookshelf.test.mjs` (pure template contents / path join / idempotent ensure-when-missing logic without Obsidian)
- Modify: `src/main.ts` (register commands)

**Interfaces:**

```ts
export const READING_BOOKSHELF_REL =
  "atomics/hobbies/Reading/Bookshelf.base";

export function readingBookshelfBaseYaml(itemsFolder: string): string;
// filters: file.inFolder(itemsFolder) + type/activity checks
// views: Cards (image property cover) + Table
```

Seeded `.base` YAML must include Cards (default) + Table views and property display names for authors/description/pages/status/tags/total_min.

Commands:

- `atomic-open-reading-bookshelf` — if Bases disabled → Notice; else ensure file exists (create only if missing), then `openFile`
- `atomic-ensure-reading-bookshelf` — create if missing only; Notice with path

v1 never overwrites an existing `.base` (user customizations in Bases UI win).

- [ ] Failing test: template contains `type: cards`, `type: table`, `cover`, and `atomics/hobbies/Reading/Items`
- [ ] Implement template + command wiring
- [ ] Commit

### Task C5: Hobby heatmap + library + dashboard section

- [ ] Heatmap series from `minutesByDate`
- [ ] Optional `Library.md` with `![[Bookshelf.base]]` embed when created via plugin
- [ ] Dashboard hobby section
- [ ] Docs: Bases bookshelf commands; Canvas = drag wikilink; optional `related_canvas`
- [ ] Security tests: folder safety + log injection + bookshelf path safety
- [ ] Commit

### Task C6: Phase C verify

- [ ] Full npm scripts + Cloud E2E skip note (Bases GUI only when Obsidian available)

---

# Phase D — Docs, E2E, security review

- [ ] Full USER_GUIDE rewrite for Atomic domains + migrate + timer + canvas
- [ ] README positioning
- [ ] AGENTS.md expectations
- [ ] Dispatch security-review agent on cumulative diff
- [ ] Manual E2E checklist from design spec (or explicit skip)
- [ ] Mark design specs status `implemented`

---

## Parallelism

```text
I18n plan ──────────────────────────── independent ──►
Phase A ──► Phase B ──►
         └─► Phase C ──► Phase D
```

After A merges, B and C may run as parallel agents with file ownership:

- B owns exercise settings CRUD + session templates + cues parameterization
- C owns `src/core/hobby.ts`, timer block, reading templates, hobby views

---

## Self-review

1. Spec coverage: id, `atomics/**`, one-click migrate skip-on-conflict, dedicated+generic cues, Reading-only, timer-log heatmaps, Bases bookshelf commands, Canvas wikilinks, legacy aliases — mapped to tasks.
2. No Simplified Chinese / i18n details — deferred to i18n plan.
3. Types/names consistent: `planFitnessMigration`, `rewriteFitnessFences`, `ActivityType`, `atomics/exercise|hobbies`.
