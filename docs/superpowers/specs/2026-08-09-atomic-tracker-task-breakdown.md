# Task breakdown: Atomic redesign (post-approval)

Date: 2026-08-09  
Status: approved (decisions locked)  
Companion design: `2026-08-09-atomic-tracker-redesign-design.md`  
Companion i18n design (separate PR): `2026-08-09-i18n-language-selection-design.md`

This is the **phased work map** for multi-agent execution after design approval. Detailed TDD steps live in `docs/superpowers/plans/2026-08-09-atomic-tracker.md`.

## Locked product constraints

- Plugin id: `obsidian-atomic`
- Default content root: `atomics/**`
- One-click **Migrate from Fitness → Atomic** (skip if destination exists)
- Reading Bases bookshelf: Cards + Table on demand (`Bookshelf.base`); soft-require Bases
- **Atomic book shelf:** `atomic-bookshelf` in `Book Shelf.md`; books on bookshelf planks; cover-open hover rewritten in our CSS/TS (Framer reference only, no Framer JS)

## Parallelism map

```text
[I18n PR] -------------------- independent --------------------►
[A Rebrand + atomics/** + migrate] ──► [B Exercise] ──►
                                     └─► [C Hobby] ──► [D Docs + verification]
```

| Track | Branch pattern | Agents | Shared files to avoid racing |
|-------|----------------|--------|------------------------------|
| I18n | `cursor/i18n-language-selection-*-1b5c` | 1 | `src/settings.ts` (coordinate with A) |
| A Rebrand + migrate | `cursor/atomic-rebrand-*-1b5c` | 1 | manifest, codeblocks, CSS, release, migrate util |
| B Exercise | `cursor/atomic-exercise-*-1b5c` | 1 | after A |
| C Hobby | `cursor/atomic-hobby-*-1b5c` | 1 | after A; parallel to B |
| D Verify/docs | `cursor/atomic-docs-verify-*-1b5c` | 1 + security-review | after B+C |

## Track I18n — language selection

- [ ] Catalog + `language` setting + Settings dropdown + wiring + tests + docs

## Track A — rebrand, `atomics/**`, one-click migrate

- [ ] id `obsidian-atomic`; defaults under `atomics/**`
- [ ] `atomic-*` + `fitness-*` aliases
- [ ] One-click migrate plan/apply + Settings button + tests
- [ ] Release `PLUGIN_ID` + README

## Track B — exercise generalization

- [ ] `ActivityType` exercise domain + Settings CRUD
- [ ] Templates, cues, session picker, tests

## Track C — hobby tracker

- [ ] Default Reading at `atomics/hobbies/Reading` (`noteModel: item`)
- [ ] Book item notes: `cover`, `authors`, `description`, `pages`, `status`, `tags` + timer fields
- [ ] TDD timer core + `atomic-timer` UI
- [ ] Commands: **Open / Ensure reading bookshelf** → `Bookshelf.base` (Bases); soft-require Bases
- [ ] `atomic-bookshelf` + **Open / Ensure book shelf**; 3D cover-open hover; click opens book note
- [ ] Hobby minutes → heatmap; optional Library embed; Canvas docs
- [ ] Security tests: path + log injection + bookshelf paths

## Track D — docs, E2E, security review

- [ ] USER_GUIDE / README / AGENTS (Bases + Atomic book shelf)
- [ ] `npm test` / typecheck / build
- [ ] Security-review agent
- [ ] Manual E2E (or Cloud skip), including book shelf hover/click

## Definition of done

1. Plugin id is `obsidian-atomic`; defaults under `atomics/**`
2. One-click Fitness migrate works (skip-on-conflict)
3. Exercise: Gym, Golf, custom types with cues/dashboard/heatmaps
4. Reading: item notes, remarks, Start/Stop timer
5. Reading Bases bookshelf opens on demand (Cards + Table)
6. Atomic book shelf opens on demand; hover opens cover; click opens book note
7. Notes remain Canvas-linkable markdown
8. Language PR sequenced; tests/docs green

## Agent execution rules

1. Prefer subagent-driven-development per task
2. B parallel C after A with file ownership
3. verification-before-completion before any done claim
4. Obsidian GUI E2E only when available
