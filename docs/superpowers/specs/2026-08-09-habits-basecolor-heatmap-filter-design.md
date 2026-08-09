# Design: Base colors, general habits CRUD, heatmap activity filter

Date: 2026-08-09  
Status: approved (implementation in progress)  
Related: `2026-08-09-atomic-tracker-redesign-design.md`

## Goal

1. Let users pick **one** habit color; derive the four heatmap shades under the hood.
2. Treat Reading as a **default general habit** that can be enabled, disabled, or deleted—not hard-coded as always on. Allow adding more general habits (item notes + timer), same model as Reading.
3. Let each `atomic-heatmap` block choose **all enabled habits**, **one habit**, or **several habits** by id.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Habit model for general trackers | Same as Reading: item notes + timer minutes |
| Disable behavior | Hide from heatmaps, dashboard, and commands (Notice if invoked while disabled) |
| Enable/disable scope | All activity types (exercise + hobby) |
| Delete | Per-row Delete with Obsidian `Modal` confirm; does not delete vault notes |
| Built-in Reading seed | Seed missing Reading only when migrating from empty/legacy lists; do **not** resurrect Reading if the user deleted it from a stored `activityTypes` array |
| Color UI | Obsidian `addColorPicker` only (no hex text fields) |
| Color storage | Persist `baseColor` + derived `colors[4]` |
| Heatmap filter | `activity: all` (default if omitted), one id, or a comma-separated list of ids |
| Multi-activity heatmap | Supported: render one heatmap per requested **enabled** id (skip unknown/disabled with inline notice, or omit quietly—prefer inline notice once if any id is invalid) |
| Non-Reading Bases bookshelf | Out of scope (Reading commands stay Reading-specific when enabled) |

## Approaches considered

### Approach 1 — `baseColor` + `enabled` on `ActivityType` (recommended, chosen)

Store `enabled` and `baseColor`; derive and persist `colors`. Uniform filters across settings, views, and commands. Heatmap reads `activity:` like bookshelf.

### Approach 2 — Keep only `colors[4]`; picker rewrites the tuple

Smaller schema change, but no stable base for the picker after legacy hand-edits.

### Approach 3 — Separate hobby feature flags outside `activityTypes`

Duplicates concepts and special-cases Reading. Rejected.

## Data model

```ts
interface ActivityType {
  id: string;
  domain: Domain; // "exercise" | "hobby"
  label: string;
  folder: string;
  enabled: boolean;
  baseColor: string; // hex, e.g. "#30a14e"
  colors: [string, string, string, string]; // derived, light → dark
  noteModel: NoteModel;
  supportsCues: boolean;
  supportsTimer: boolean;
  supportsSetTable: boolean;
}
```

### Color rules

- Pure helper `shadesFromBaseColor(baseColor): [string, string, string, string]` (light → dark).
- Called on create, color-picker change, and normalize.
- Built-in fidelity: known bases for Gym / Golf / Reading map to today’s exact `GREEN` / `ORANGE` / `BLUE` tuples (seeded lookup). Other bases use a general lighten/darken ramp.
- Defaults: Gym `baseColor = GREEN[2]`, Golf `ORANGE[2]`, Reading `BLUE[2]`; new exercises default to Gym green base; new hobbies default to Reading blue base.

### Migration / normalize

When loading settings:

1. Missing `enabled` → `true`.
2. Missing `baseColor` → `colors[2]` if present, else domain default base.
3. Regenerate `colors` from `baseColor` via `shadesFromBaseColor` (built-in bases keep exact palettes).
4. Built-in hobby append (`appendNewBuiltInActivities`): only add missing built-in hobbies when the stored list is empty or came from legacy `series` migration—not when a non-empty modern `activityTypes` array simply omits Reading.

### Enabled filtering

`exerciseActivities` / `hobbyActivities` (and any command/dashboard/heatmap consumers) include only `enabled === true`. Capability flags (`supportsCues`, `supportsTimer`, …) stay as today.

## Settings UI

### Exercise types

Per exercise row:

- Enable/disable toggle
- Label, folder, cues toggle (existing)
- One color picker → `baseColor` (replaces four hex inputs)
- Read-only 4-swatch preview of derived shades
- Delete (confirm)

Add exercise unchanged in spirit; new rows get `enabled: true` and a default `baseColor`.

### General habits (new section)

Mirror exercise UX for hobbies:

- Default Reading row (`enabled` toggleable)
- Label, folder (no cues toggle)
- Color picker + 4-swatch preview
- Delete (confirm)
- Add general habit → `createHobbyActivityType` under `atomics/hobbies/<Name>`

Reuse stacking layout classes so bilingual labels do not overflow beside controls.

## Commands

- Only **enabled** activities participate in pickers and shortcut commands.
- Reading-specific commands remain, but Notice and no-op when Reading is missing or disabled.
- New **New hobby item** command: fuzzy picker over enabled hobbies; creates an item note using the Reading item template pattern parameterized by activity id/folder/label.
- Gym/Golf/new-exercise shortcuts skip disabled activities.

## Heatmap (`atomic-heatmap`)

| Option | Behavior |
|--------|----------|
| omit / `activity: all` | Render heatmaps for all **enabled** exercise + hobby activities |
| `activity: <id>` | Render only that activity if it exists and is enabled |
| `activity: <id1>, <id2>, …` | Render one heatmap per listed id that exists and is enabled, in list order |

Parsing: split on commas, trim, drop empties; treat the token `all` (case-insensitive) as the all-enabled set. If the list mixes `all` with specific ids, treat the whole value as **all**.

Unknown or disabled ids: show a short inline i18n message for those ids and still render any valid ones. If none are valid, show only the error/empty state.

Existing `year:` resolution unchanged. Parse/filter in the heatmap path (same idea as `atomic-bookshelf` `activity:`).

## Error handling

| Case | Behavior |
|------|----------|
| Heatmap unknown or disabled id(s) | Inline message for invalid ids; still render any valid listed activities |
| Command for disabled/missing activity | Notice; do not create notes |
| Delete activity | Obsidian confirm modal; on confirm remove from `activityTypes` only; leave vault files |

## Testing

Pure-module coverage:

- `shadesFromBaseColor` + built-in palette fidelity
- `normalizeActivityType` / `mergeSettings` for `enabled`, `baseColor`, and no Reading resurrection after delete
- Heatmap activity filter: all / one / multi-id list / unknown / disabled / mixed `all`+ids
- `enabled` filtering in exercise/hobby helpers
- i18n key parity for new settings/command/heatmap strings

## Out of scope

- Generalizing Bases bookshelf beyond Reading
- Changing timer-log or item-note markdown format
- Auto-deleting vault folders when an activity is removed from settings

## Implementation touchpoints (expected)

| Area | Files |
|------|--------|
| Model / colors | `src/types.ts`, new or existing util for `shadesFromBaseColor` |
| Normalize / merge | `src/util/activity-types.ts`, `src/util/merge-settings.ts` |
| Settings UI | `src/settings.ts`, `styles.css`, i18n locales |
| Commands | `src/main.ts`, reading/hobby create commands |
| Heatmap | `src/views/heatmap.ts`, `src/codeblocks.ts` |
| Consumers | `src/views/dashboard.ts`, today/cues as needed for `enabled` |
| Tests | `tests/*.mjs` for colors, merge, heatmap filter, activity filters |

## Success criteria

1. Settings show one color picker per activity; heatmaps still show four intensity shades.
2. Users can add/disable/delete general habits; Reading is not forced back after delete.
3. Disabled habits disappear from heatmaps, dashboard rolls, and commands.
4. `atomic-heatmap` defaults to all enabled habits; `activity: <id>` or `activity: a, b` shows those enabled habits.
5. `npm test`, `npm run typecheck`, and `npm run build` pass.
