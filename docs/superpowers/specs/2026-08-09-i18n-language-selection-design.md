# Design: Language selection (i18n)

Date: 2026-08-09  
Status: proposed (awaiting approval)  
PR scope: **standalone** — no Atomic rebrand, no exercise/hobby domain changes

## Goal

Add a user-facing language setting so the plugin UI can switch between:

1. **Traditional Chinese & English** (bilingual labels, current HK-style copy)
2. **English** (English-only labels)

Pure logic stays in Obsidian-free modules so locale packing and lookup stay unit-testable.

## Assumptions (correct if wrong)

| Topic | Assumption |
|-------|------------|
| Locale set | Exactly two modes: `zh-Hant-en` and `en`. No Simplified Chinese, no zh-only mode in v1 |
| Default | `zh-Hant-en` (matches today’s hardcoded bilingual strings and `Asia/Hong_Kong` default timezone) |
| Scope of translation | Settings tab, Notices, command names, codeblock UI chrome, session templates, dashboard/cue/today/actions labels |
| Out of scope for this PR | Renaming plugin to Atomic, new codeblock languages, vault folder renames, hobby tracker |
| User content | Session notes, cue bullets, and frontmatter values the user typed are never auto-translated |
| Persistence | New settings key `language` in plugin `data.json` via existing merge path |

## Decisions (proposed)

| Topic | Choice |
|-------|--------|
| API | `t(key, lang, vars?)` string catalog in `src/i18n/` |
| Catalog shape | Flat keys (`settings.timezone`, `notice.sessionCreated`) with per-locale maps |
| Bilingual mode | One string per key that already contains both languages where useful (`Date / 日期`), not runtime concatenation of two locales |
| English mode | English-only string for the same key |
| Dates | Keep `src/dates.ts` formatters; pick `zh-HK` vs English month names from `language` |
| Hot switch | Changing language re-renders tracked codeblocks and refreshes Settings labels without requiring Obsidian restart |
| Commands | Register command names from catalog at `onload`; on language change, update displayed names if Obsidian API allows, else Notice “Reload plugin to refresh command names” |
| Migration | Absent `language` → default `zh-Hant-en` (no break for existing users) |

## Approaches considered

### A — String catalog + `t()` (recommended)

Add `src/i18n/locales/{en,zh-Hant-en}.ts` and `t()`. Replace hardcoded UI strings incrementally behind the catalog.

- Pros: testable, explicit keys, matches “two modes” request, small blast radius
- Cons: first pass is a large mechanical string move

### B — Dual-write helpers (`en()` / `bilingual()`)

Keep strings co-located at call sites with helper wrappers.

- Pros: fewer files
- Cons: hard to audit coverage; bilingual drift; weak for settings-driven switch

### C — External JSON locale packs

Load JSON from the plugin folder.

- Pros: translators edit JSON without touching TS
- Cons: overkill for two modes; worse type safety; not needed yet

**Recommendation:** A.

## Architecture

```text
Settings.language ──► getLocale(settings)
                         │
                         ▼
              t(key, locale) / formatDate(...)
                         │
         ┌───────────────┼────────────────┐
         ▼               ▼                ▼
   Settings tab    Codeblock views    Templates / Notices
```

### New / touched files (this PR only)

| Path | Role |
|------|------|
| `src/i18n/types.ts` | `Language` union, `LocaleTable` |
| `src/i18n/locales/en.ts` | English catalog |
| `src/i18n/locales/zh-Hant-en.ts` | Bilingual catalog (seeded from current strings) |
| `src/i18n/index.ts` | `t()`, `getLocale()`, catalog registry |
| `src/types.ts` | add `language` to settings + default |
| `src/util/merge-settings.ts` | sanitize `language` |
| `src/settings.ts` | Language dropdown |
| `src/main.ts`, `src/views/*`, `src/commands/*`, `src/codeblocks.ts` | replace user-visible literals with `t()` |
| `src/dates.ts` | locale-aware month formatting from language |
| `tests/i18n.test.mjs` | key parity, fallback, interpolation |
| `docs/USER_GUIDE.md`, `README.md` | document the setting |

### Settings UI

New row at top of Settings:

- Name: **Language / 語言** (label itself follows active language after change)
- Control: dropdown
  - `Traditional Chinese & English`
  - `English`

### Catalog rules

1. Every key exists in both locale files (test enforces parity).
2. Missing key in active locale falls back to English, then to the key name (dev-visible).
3. Interpolation: `t("notice.created", lang, { path })` with `{name}` placeholders only.
4. Do not put vault paths or user markdown into the catalog.

## Security

- Language is an enum; reject unknown values in `mergeSettings`.
- Catalog is compile-time data only; no `eval`, no loading remote locale files.
- Interpolation must escape nothing into HTML beyond what views already do; prefer `textContent` / Obsidian APIs already used.

## Testing

| Layer | What |
|-------|------|
| Unit | Key parity across locales; unknown language → default; interpolation; date format switch |
| Typecheck / build | `npm run typecheck`, `npm run build` |
| Manual (when Obsidian available) | Flip Language in Settings; confirm Settings labels, dashboard chrome, Notices, and new-session template headings update |
| Cloud VM | Skip GUI; note in PR |

## Docs

- `docs/USER_GUIDE.md`: new Settings row + screenshots later when Obsidian available
- `README.md`: one-line mention of language selection
- No Atomic rename copy in this PR

## Out of scope

- Renaming `fitness-*` codeblock languages
- Changing manifest `id` / plugin display name
- Custom exercises / hobby tracker
- Community plugin directory listing copy

## Open questions for approver

1. Confirm default stays `zh-Hant-en`.
2. Confirm we do **not** add a Traditional-Chinese-only mode in v1.
3. Command palette: is a reload Notice acceptable if Obsidian cannot rename commands live?
