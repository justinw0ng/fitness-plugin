# Golf/Gym Cues Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `fitness-cues` → `fitness-golf-cues`, add `fitness-gym-cues`, keep a settings-gated legacy alias with one-click vault migration, and document agent testing/screenshot rules.

**Architecture:** Shared Obsidian-free helpers for settings merge and fence rewrite; one `renderCues(..., kind)` view for golf/gym; codeblock registration for the two new languages plus legacy gated by `deprecatedFitnessCuesEnabled`; settings UI for paths, legacy toggle, and migrate button.

**Tech Stack:** TypeScript Obsidian plugin, esbuild, Node test runner (`npm test` with `--experimental-strip-types`), no Obsidian GUI in default Cloud VM.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-golf-gym-cues-blocks-design.md`
- Pure logic / unit tests stay Obsidian-free (`src/core.ts`, `src/util/*`)
- Validate with `npm test`, `npm run typecheck`, `npm run build`
- `main.js` is a committed build artifact — rebuild and include it when shipping plugin behavior changes
- Do not remove `fitness-cues` entirely in this release
- Legacy settings UI label must be exactly: **Allow legacy `fitness-cues` block**
- Branch: `cursor/golf-gym-cues-blocks-40a3` (already exists)
- After Obsidian-touching changes, if screenshots are impossible, note Obsidian unavailable (do not invent screenshots)

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types.ts` | `golfCuesPath`, `gymCuesPath`, `deprecatedFitnessCuesEnabled`; drop `cuesPath` from typed settings |
| `src/util/merge-settings.ts` | Pure `mergeSettings` (legacy `cuesPath` → `golfCuesPath`) |
| `src/util/migrate-cues.ts` | Pure `rewriteFitnessCuesFences(markdown)` |
| `src/settings.ts` | Settings tab UI + migrate button (uses vault + helpers) |
| `src/views/cues.ts` | Shared `renderCues` by kind |
| `src/views/dashboard.ts` | Golf + gym cue links |
| `src/codeblocks.ts` | New block kinds + legacy gate |
| `src/commands/create-session.ts` | Gym template Reminders section |
| `src/main.ts` | Wire migrate/reload notices if needed |
| `tests/settings-migrate.test.mjs` | Merge + fence rewrite tests |
| `docs/USER_GUIDE.md`, `README.md`, `AGENTS.md` | Docs + agent screenshot/E2E rules |

### Parallelism

- **Task 1** (foundation) and **Task 2** (docs) are independent → run in parallel.
- **Task 3** (plugin wiring) depends on Task 1.
- **Task 4** (verify + bundle) depends on Tasks 1–3.

---

### Task 1: Settings merge + fence rewrite (pure helpers)

**Files:**
- Modify: `src/types.ts`
- Create: `src/util/merge-settings.ts`
- Create: `src/util/migrate-cues.ts`
- Modify: `src/settings.ts` — re-export `mergeSettings` from util; leave UI for Task 3
- Create: `tests/settings-migrate.test.mjs`

**Interfaces:**
- Produces:
  - `FitnessSettings` with `golfCuesPath: string`, `gymCuesPath: string`, `deprecatedFitnessCuesEnabled: boolean` (no `cuesPath`)
  - `mergeSettings(raw: Partial<FitnessSettings> & { cuesPath?: string } | null | undefined): FitnessSettings`
  - `rewriteFitnessCuesFences(markdown: string): { markdown: string; replacements: number }`
- Consumes: existing `DEFAULT_SETTINGS` shape after update; `sanitizeSeries` logic currently in `settings.ts` (move with merge or keep merge calling a shared sanitize — prefer move sanitize into `merge-settings.ts` alongside merge)

- [ ] **Step 1: Write failing tests** in `tests/settings-migrate.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { mergeSettings } from "../src/util/merge-settings.ts";
import { rewriteFitnessCuesFences } from "../src/util/migrate-cues.ts";
import { DEFAULT_SETTINGS } from "../src/types.ts";

test("mergeSettings defaults include golf/gym paths and legacy on", () => {
  const s = mergeSettings(null);
  assert.equal(s.golfCuesPath, "Golf/Cues.md");
  assert.equal(s.gymCuesPath, "Gym/Cues.md");
  assert.equal(s.deprecatedFitnessCuesEnabled, true);
  assert.equal("cuesPath" in s, false);
});

test("mergeSettings maps legacy cuesPath to golfCuesPath", () => {
  const s = mergeSettings({ cuesPath: "Custom/GolfCues.md" });
  assert.equal(s.golfCuesPath, "Custom/GolfCues.md");
});

test("mergeSettings prefers golfCuesPath over cuesPath", () => {
  const s = mergeSettings({
    cuesPath: "Old.md",
    golfCuesPath: "New.md",
  });
  assert.equal(s.golfCuesPath, "New.md");
});

test("mergeSettings respects deprecatedFitnessCuesEnabled false", () => {
  const s = mergeSettings({ deprecatedFitnessCuesEnabled: false });
  assert.equal(s.deprecatedFitnessCuesEnabled, false);
});

test("rewriteFitnessCuesFences rewrites fence language only", () => {
  const input = `# Cues\n\nUse fitness-cues in prose.\n\n\`\`\`fitness-cues\nyear: 2026\n\`\`\`\n`;
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /```fitness-golf-cues\n/);
  assert.match(markdown, /Use fitness-cues in prose/);
  assert.doesNotMatch(markdown, /```fitness-cues\b/);
});

test("rewriteFitnessCuesFences is idempotent for new name", () => {
  const input = "```fitness-golf-cues\n```\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 0);
  assert.equal(markdown, input);
});

test("rewriteFitnessCuesFences handles tildes and info strings", () => {
  const input = "~~~fitness-cues extra\nyear: 1\n~~~\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /~~~fitness-golf-cues extra\n/);
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- tests/settings-migrate.test.mjs
```

Expected: FAIL (module/export missing)

- [ ] **Step 3: Implement types + helpers**

`src/types.ts` — replace `cuesPath` with:

```typescript
export interface FitnessSettings {
  timezone: string;
  series: SeriesConfig[];
  dashboardPath: string;
  golfCuesPath: string;
  gymCuesPath: string;
  deprecatedFitnessCuesEnabled: boolean;
}

export const DEFAULT_SETTINGS: FitnessSettings = {
  timezone: "Asia/Hong_Kong",
  dashboardPath: "Fitness/Dashboard.md",
  golfCuesPath: "Golf/Cues.md",
  gymCuesPath: "Gym/Cues.md",
  deprecatedFitnessCuesEnabled: true,
  series: [ /* unchanged gym + golf */ ],
};
```

`src/util/migrate-cues.ts`:

```typescript
/** Rewrite fenced codeblock language `fitness-cues` → `fitness-golf-cues` only. */
export function rewriteFitnessCuesFences(markdown: string): {
  markdown: string;
  replacements: number;
} {
  let replacements = 0;
  const markdownOut = String(markdown).replace(
    /(^|\n)(```|~~~)(fitness-cues)(\b[^\n]*)/g,
    (_m, pre, fence, _lang, rest) => {
      replacements += 1;
      return `${pre}${fence}fitness-golf-cues${rest}`;
    },
  );
  return { markdown: markdownOut, replacements };
}
```

`src/util/merge-settings.ts` — move `sanitizeSeries` + `mergeSettings` here from `settings.ts`. Accept legacy:

```typescript
type RawSettings = Partial<FitnessSettings> & { cuesPath?: string };

export function mergeSettings(raw: RawSettings | null | undefined): FitnessSettings {
  const base = { ...DEFAULT_SETTINGS, series: DEFAULT_SETTINGS.series };
  if (!raw) return { ...base, series: [...base.series] };
  const golfCuesPath =
    (raw.golfCuesPath && raw.golfCuesPath.trim()) ||
    (raw.cuesPath && raw.cuesPath.trim()) ||
    base.golfCuesPath;
  return {
    timezone: raw.timezone || base.timezone,
    dashboardPath: raw.dashboardPath || base.dashboardPath,
    golfCuesPath,
    gymCuesPath: (raw.gymCuesPath && raw.gymCuesPath.trim()) || base.gymCuesPath,
    deprecatedFitnessCuesEnabled:
      raw.deprecatedFitnessCuesEnabled === false ? false : true,
    series: sanitizeSeries(raw.series, base.series),
  };
}
```

`src/settings.ts` — delete local merge/sanitize; `export { mergeSettings } from "./util/merge-settings";` and keep temporary UI still compiling: update field names to `golfCuesPath` only as needed so `tsc` doesn’t fail mid-branch (minimal: change cuesPath references to golfCuesPath; full UI in Task 3).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- tests/settings-migrate.test.mjs
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/util/merge-settings.ts src/util/migrate-cues.ts src/settings.ts tests/settings-migrate.test.mjs
git commit -m "Add settings merge and fitness-cues fence rewrite helpers"
```

---

### Task 2: Documentation + AGENTS screenshot/E2E rules (parallel with Task 1)

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/USER_GUIDE.md`
- Modify: `README.md` (only if it needs block-name clarity)
- Modify: `docs/superpowers/specs/2026-08-09-golf-gym-cues-blocks-design.md` — set Status to `approved`

**Interfaces:** None (docs only). Uses names from the design spec.

- [ ] **Step 1: Update `AGENTS.md`** — keep existing Cloud notes; append a section:

```markdown
## Testing and Obsidian screenshots

- Always run `npm test`, `npm run typecheck`, and `npm run build` before claiming work complete.
- When Obsidian is available in the environment, also do a short manual E2E pass:
  1. Enable the plugin in a demo vault
  2. Open notes with `fitness-golf-cues` and `fitness-gym-cues`
  3. Confirm legacy `fitness-cues` works while **Allow legacy `fitness-cues` block** is on
  4. Run **Migrate `fitness-cues` → `fitness-golf-cues`** on a demo note and confirm the legacy toggle turns off
- When Obsidian is not available (typical Cursor Cloud VM), skip GUI E2E and screenshots; note that in the PR/summary.
- When capturing Obsidian screenshots for docs:
  1. Disable **Readable line length** (Settings → Editor)
  2. Use **fullscreen** Obsidian
  3. Use **Light** mode
```

- [ ] **Step 2: Update `docs/USER_GUIDE.md`**
  - Feature table: Golf → `fitness-golf-cues`; add Gym cue rollup → `fitness-gym-cues`; note legacy `fitness-cues`
  - Settings table: Golf cues path, Gym cues path, Allow legacy toggle, Migrate button
  - Layout: add `Gym/Cues.md`
  - Examples for both cue notes
  - Session notes: gym Reminders feed gym cues; golf unchanged
  - Mention migrate + legacy toggle under settings

- [ ] **Step 3: Light README touch** if needed (cue rollups plural / both sports)

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs/USER_GUIDE.md README.md docs/superpowers/specs/2026-08-09-golf-gym-cues-blocks-design.md
git commit -m "Document golf/gym cues blocks and Obsidian screenshot rules"
```

---

### Task 3: Plugin wiring (blocks, views, settings UI, gym template)

**Files:**
- Modify: `src/views/cues.ts`
- Modify: `src/views/dashboard.ts`
- Modify: `src/codeblocks.ts`
- Modify: `src/settings.ts`
- Modify: `src/commands/create-session.ts`
- Modify: `src/main.ts` (only if migrate helper needs plugin methods)

**Interfaces:**
- Consumes: `mergeSettings`, `rewriteFitnessCuesFences`, new `FitnessSettings` fields
- Produces:
  - `renderCues(el, data, seriesList, year, timezone, kind: "golf" | "gym")`
  - `renderDashboard(..., golfCuesPath, gymCuesPath)`
  - Codeblock kinds: `fitness-golf-cues`, `fitness-gym-cues`, `fitness-cues` (legacy)
  - Settings migrate button scans `app.vault.getMarkdownFiles()`, applies rewrite, saves, then sets `deprecatedFitnessCuesEnabled = false`

- [ ] **Step 1: Generalize `src/views/cues.ts`**
  - Rename export to `renderCues` (keep `renderGolfCues` as thin wrapper calling `renderCues(..., "golf")` only if useful; prefer single export)
  - Resolve series: `seriesList.find(s => s.kind === kind)` with folder fallbacks `Golf` / `Gym`
  - Missing series message: `No golf series configured.` / `No gym series configured.`

- [ ] **Step 2: Update `src/codeblocks.ts`**
  - Cases: `fitness-golf-cues` → kind golf; `fitness-gym-cues` → kind gym; `fitness-cues` → if `settings.deprecatedFitnessCuesEnabled` then golf else muted message that legacy is disabled
  - Register always: `fitness-heatmap`, `fitness-today`, `fitness-dashboard`, `fitness-golf-cues`, `fitness-gym-cues`, `fitness-cues`, `fitness-actions`
  - Practical note: Obsidian cannot easily unregister processors; gating in `renderBlock` gives immediate toggle behavior without reload (matches spec’s “when practical” clause). Still show Notice on toggle: “Legacy fitness-cues setting saved.”
  - Dashboard call passes `settings.golfCuesPath`, `settings.gymCuesPath`

- [ ] **Step 3: Update dashboard links** for golf + gym paths

- [ ] **Step 4: Settings UI**
  - Golf cues path / Gym cues path
  - Toggle: **Allow legacy `fitness-cues` block** with description: “Keep supporting the old golf cue codeblock name. Turn off after migrating notes (or use Migrate).”
  - Button: **Migrate `fitness-cues` → `fitness-golf-cues`**
    - For each markdown file: read → `rewriteFitnessCuesFences` → write if replacements > 0
    - On full success: set flag false, saveSettings, refreshAll, Notice with file/block counts
    - On failure: Notice + console.error; do **not** flip flag

- [ ] **Step 5: Gym template** — append Reminders section like golf after the sets table:

```markdown
## 💡 Reminders / 提醒

- 
```

- [ ] **Step 6: typecheck + unit tests**

```bash
npm test
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/views/cues.ts src/views/dashboard.ts src/codeblocks.ts src/settings.ts src/commands/create-session.ts src/main.ts
git commit -m "Wire fitness-golf-cues and fitness-gym-cues blocks with legacy migrate"
```

---

### Task 4: Build artifact + verification

**Files:**
- Modify: `main.js` (via `npm run build`)

- [ ] **Step 1: Production build**

```bash
npm run build
```

- [ ] **Step 2: Full verify**

```bash
npm test && npm run typecheck && npm run build
```

Expected: all pass

- [ ] **Step 3: Obsidian E2E/screenshots**
  - If Obsidian available: follow `AGENTS.md` screenshot rules and capture updated settings / cue views if docs images are stale
  - If not: skip and state in PR body

- [ ] **Step 4: Commit bundle + push**

```bash
git add main.js
git commit -m "Rebuild main.js for golf/gym cues blocks"
git push -u origin cursor/golf-gym-cues-blocks-40a3
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| `fitness-golf-cues` / `fitness-gym-cues` | 3 |
| Legacy `fitness-cues` + flag | 1, 3 |
| Shared renderer | 3 |
| Gym Reminders template | 3 |
| `golfCuesPath` / `gymCuesPath` + legacy map | 1, 3 |
| Migrate button | 3 |
| Dashboard both links | 3 |
| USER_GUIDE / README / AGENTS screenshots | 2 |
| Unit tests merge + rewrite | 1 |
| Build artifact | 4 |
