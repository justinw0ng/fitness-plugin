# Habits baseColor / general habits / heatmap filter — Implementation Plan

> **For agentic workers:** Implement task-by-task. Prefer TDD for pure modules. Checkboxes track progress.

**Goal:** One color picker per activity (`baseColor` → 4 shades), enable/disable/delete for exercise + general habits (Reading not hard-forced), and `atomic-heatmap` `activity:` all / one / many ids.

**Spec:** `docs/superpowers/specs/2026-08-09-habits-basecolor-heatmap-filter-design.md`

**Architecture:** Extend `ActivityType` with `enabled` + `baseColor`; pure `shadesFromBaseColor` + normalize/merge; settings CRUD for hobbies; filter enabled activities in views/commands; parse heatmap `activity` lists in pure helper then render.

**Tech Stack:** TypeScript, Obsidian Settings/`addColorPicker`, Node test runner, esbuild.

## Global constraints

- Persist both `baseColor` and derived `colors[4]`
- Built-in Gym/Golf/Reading bases keep exact GREEN/ORANGE/BLUE tuples
- Missing `enabled` → true; missing `baseColor` → `colors[2]` or domain default
- Do not resurrect deleted Reading when modern `activityTypes` omits it
- Heatmap: omit/`all` = all enabled; comma list = those enabled ids in order; invalid ids → inline notice + render valids
- Delete confirms via Obsidian Modal; never deletes vault files
- Every task: relevant tests green; before done: `npm test`, `npm run typecheck`, `npm run build`
- `git checkout -- main.js` unless intentionally shipping the bundle (CI/version bump may rewrite version files)

---

## Task 1: Color shades helper + ActivityType fields

**Files:**
- Create: `src/util/colors.ts`, `tests/colors.test.mjs`
- Modify: `src/types.ts`, `src/util/activity-types.ts`, `tests/activity-types.test.mjs`

- [ ] Add `shadesFromBaseColor` with seeded exact maps for GREEN[2]/ORANGE[2]/BLUE[2]
- [ ] Add `enabled` + `baseColor` to `ActivityType` and defaults
- [ ] `createExerciseActivityType` / `createHobbyActivityType` set `enabled: true`, `baseColor`, derived `colors`
- [ ] `normalizeActivityType` migrates missing fields and regenerates colors
- [ ] `exerciseActivities` / `hobbyActivities` filter `enabled === true`
- [ ] Tests for shades, normalize, enabled filter
- [ ] Commit

## Task 2: mergeSettings Reading seed policy

**Files:**
- Modify: `src/util/merge-settings.ts`, `tests/settings-migrate.test.mjs`

- [ ] Only append missing built-in hobbies when list is empty or from legacy `series`
- [ ] Do not re-add Reading if modern `activityTypes` omits it
- [ ] Preserve `enabled: false` when stored
- [ ] Commit

## Task 3: Heatmap activity filter (pure + wire)

**Files:**
- Create or extend: helper in `src/views/heatmap.ts` or `src/util/heatmap-activities.ts` + tests
- Modify: `src/codeblocks.ts`, `src/views/heatmap.ts`, i18n locales

- [ ] `resolveHeatmapActivities(activityTypes, activityOption)` → `{ activities, invalidIds }`
- [ ] Wire `opts.activity` from codeblock
- [ ] Inline message for invalid/disabled ids; render valid heatmaps
- [ ] Commit

## Task 4: Settings UI — color picker, enable, delete, hobbies

**Files:**
- Modify: `src/settings.ts`, `styles.css`, `src/i18n/locales/en.ts`, `zh-Hant-en.ts`

- [ ] Replace 4 color texts with `addColorPicker` + swatch preview
- [ ] Enable toggle + Delete (Modal confirm) on exercise rows
- [ ] General habits section: list hobbies, add, enable, color, delete
- [ ] Commit

## Task 5: Commands respect enabled + New hobby item

**Files:**
- Modify: `src/main.ts`, `src/commands/create-reading-item.ts` (or generalize), i18n

- [ ] Gate Reading/Gym/Golf/exercise pickers on enabled
- [ ] Add New hobby item command over enabled hobbies
- [ ] Commit

## Task 6: Dashboard/other consumers + verify

**Files:**
- Modify: `src/views/dashboard.ts` (and any other direct activity loops) as needed
- Run: `npm test`, `npm run typecheck`, `npm run build`

- [ ] Ensure dashboard/today/cues use enabled filters
- [ ] Full verify; ship `main.js` if settings/runtime changed
- [ ] Update PR

---

## Done when

1. One color picker per activity; heatmaps show four shades
2. Add/disable/delete general habits; Reading not force-resurrected
3. Disabled habits hidden from heatmaps/dashboard/commands
4. `atomic-heatmap` supports all / one / many ids
5. Tests, typecheck, build pass
