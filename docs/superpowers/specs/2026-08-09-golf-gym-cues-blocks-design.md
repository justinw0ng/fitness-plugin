# Design: `fitness-golf-cues` / `fitness-gym-cues` blocks

Date: 2026-08-09  
Status: approved

## Goal

Rename the golf cue rollup codeblock from `fitness-cues` to `fitness-golf-cues`, add a symmetric `fitness-gym-cues` block, keep the old name as a temporary alias with an explicit settings escape hatch, and document agent testing / Obsidian screenshot rules.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Gym cue source | Same as golf: `## Reminders` bullets in session notes; gym session template gains that section |
| Old block name | Keep `fitness-cues` as deprecated alias → golf, until disabled |
| Architecture | Shared cue renderer parameterized by series kind (`golf` \| `gym`) |
| Settings paths | `golfCuesPath` + `gymCuesPath`; migrate legacy `cuesPath` → `golfCuesPath` |
| Legacy flag | Persisted `deprecatedFitnessCuesEnabled` (default `true`), exposed in Settings as **Allow legacy `fitness-cues` block** |
| Migration UX | One-click button: rewrite vault fences, then set legacy flag to `false` |
| Dashboard | Links for both golf and gym cue notes |

## Blocks & rendering

### Registered languages

- `fitness-golf-cues` — always registered
- `fitness-gym-cues` — always registered
- `fitness-cues` — registered only while `deprecatedFitnessCuesEnabled` is `true`; renders as golf cues

### Shared renderer

Generalize today’s golf-only view into something like `renderCues(..., kind: "golf" | "gym")`:

1. Resolve series from settings (`kind` match, with folder fallbacks consistent with current golf logic).
2. List sessions for that folder/year; read bodies; `parseReminders`.
3. Attach focus tags when present (golf); gym may have empty focus — UI already handles empty focus bits.
4. Render **This month / 本月** and **Keepers / 常駐提醒** the same way as today.

Year resolution stays: codeblock `year` → note frontmatter `year` → timezone “now”.

### Session templates

- Golf: unchanged Reminders section.
- Gym: add `## 💡 Reminders / 提醒` (with empty bullet) so gym cues have a place to land.

## Settings & migration

### Settings fields

| Key | Default | UI |
|-----|---------|-----|
| `golfCuesPath` | `Golf/Cues.md` | Golf cues path |
| `gymCuesPath` | `Gym/Cues.md` | Gym cues path |
| `deprecatedFitnessCuesEnabled` | `true` | **Allow legacy `fitness-cues` block** — “Keep supporting the old golf cue codeblock name. Turn off after migrating notes (or use Migrate).” |
| `timezone`, `dashboardPath`, `series` | unchanged | unchanged |

Legacy load: if stored settings have `cuesPath` and no `golfCuesPath`, map `cuesPath` → `golfCuesPath`.

Toggling the legacy flag must persist and update registration / live blocks so `fitness-cues` stops (or resumes) processing without a full app restart when practical; if re-registration requires reload, show a Notice asking to reload the plugin/Obsidian.

### Migrate button

Label idea: **Migrate `fitness-cues` → `fitness-golf-cues`**

Behavior:

1. Scan markdown notes in the vault.
2. Rewrite fenced codeblock language tags `fitness-cues` → `fitness-golf-cues` only (do not rewrite unrelated prose mentioning the string).
3. Save modified files; Notice with files-changed / blocks-rewritten counts.
4. Set `deprecatedFitnessCuesEnabled` to `false`, save settings, refresh registration/blocks.

Idempotent: already-migrated vaults report zero changes and still leave the flag off.

Pure rewrite logic lives in Obsidian-free helpers (testable in `tests/`) so the scan/replace rules are unit-tested.

## Dashboard

Yearly dashboard shows two links:

- Golf cue rollup → `golfCuesPath`
- Gym cue rollup → `gymCuesPath`

## Documentation

Update:

- `docs/USER_GUIDE.md` — feature table, layout (`Gym/Cues.md`), examples for both blocks, legacy + migrate + toggle, gym Reminders feeding gym cues
- `README.md` — brief mention if it lists blocks/features
- `AGENTS.md` — testing expectations:
  - Always: `npm test`, `npm run typecheck`, `npm run build`
  - When Obsidian is available: short manual E2E (enable plugin; open golf/gym cue notes; exercise migrate on a demo note; confirm legacy toggle)
  - When capturing Obsidian screenshots for docs:
    1. Disable **Readable line length**
    2. Use **fullscreen**
    3. Use **Light** mode
  - When Obsidian is not available (typical Cloud VM): unit/typecheck/build only; skip screenshots and note why

## Testing

- Settings merge: defaults, `cuesPath` → `golfCuesPath`, flag default/override
- Fence rewrite helper: only language tags; multiple blocks; leave prose alone; already-new names untouched
- Cue aggregation helpers remain covered; add gym-path cases if series selection is extracted to core
- No Obsidian GUI in default Cloud VM — E2E/screenshots only when the environment has Obsidian

## Non-goals / later

- Removing `fitness-cues` entirely (planned for a later release after migration period)
- Custom per-series cue heading names
- Changing keepers threshold or cue UI layout beyond series symmetry

## Error handling

- Missing series: muted message (same pattern as “No golf series configured”, gym-equivalent wording)
- Migration I/O errors: Notice + console error; do not flip legacy flag off if rewrite aborted mid-flight without a clear success path (prefer: only disable legacy after successful scan/rewrite pass completes)
