# Task breakdown: Atomic redesign (post-approval)

Date: 2026-08-09  
Status: approved (decisions locked)  
Companion design: `2026-08-09-atomic-tracker-redesign-design.md`  
Companion i18n design (separate PR): `2026-08-09-i18n-language-selection-design.md`

This is the **phased work map** for multi-agent execution after design approval. Detailed TDD steps land in `docs/superpowers/plans/` via the writing-plans skill once the specs are approved.

## Parallelism map

```text
[I18n PR] -------------------- independent --------------------►
[A Rebrand] ──► [B Exercise] ──►
            └─► [C Hobby]    ──► [D Docs + verification]
```

| Track | Branch pattern | Agents | Shared files to avoid racing |
|-------|----------------|--------|------------------------------|
| I18n | `cursor/i18n-language-selection-*-1b5c` | 1 | `src/settings.ts` (coordinate merge with A) |
| A Rebrand | `cursor/atomic-rebrand-*-1b5c` | 1 | manifest, codeblocks, CSS, release workflow |
| B Exercise | `cursor/atomic-exercise-*-1b5c` | 1 | starts after A merges |
| C Hobby | `cursor/atomic-hobby-*-1b5c` | 1 | starts after A merges; parallel to B |
| D Verify/docs | `cursor/atomic-docs-verify-*-1b5c` | 1 + security-review agent | after B+C |

If I18n and A both need `settings.ts`, merge I18n first or have A reserve a Language placeholder row only.

## Track I18n — language selection

- [ ] Catalog types + `en` / `zh-Hant-en` tables
- [ ] `t()` + settings key `language`
- [ ] Settings dropdown + wire views/notices/templates
- [ ] Unit tests (parity, fallback)
- [ ] USER_GUIDE snippet
- [ ] `npm test` / typecheck / build
- [ ] Security: enum sanitize only (no remote packs)

## Track A — rebrand shell

- [ ] `manifest.json` / package description → Atomic; id `obsidian-atomic`
- [ ] Register `atomic-*` languages; alias `fitness-*` behind flag
- [ ] CSS root transition `fitness-plugin` → `atomic-plugin`
- [ ] Release workflow `PLUGIN_ID`
- [ ] Migrate helper stub for fence rewrites
- [ ] Tests for alias + migrate rewrite
- [ ] README install path update

## Track B — exercise generalization

- [ ] `ActivityType` model; migrate `series` → exercise activity types
- [ ] Settings CRUD for exercise types
- [ ] Custom exercise daily-session template
- [ ] Cues parameterized by activity id (`supportsCues`)
- [ ] Commands: session picker / per-type create
- [ ] Dashboard/heatmap consume activity types
- [ ] Unit tests: merge, cues filter, folder safety

## Track C — hobby tracker

- [ ] Default Reading hobby type (`noteModel: item`)
- [ ] Create item note command + template
- [ ] TDD timer core (start/stop/resume/discard, log parse/append)
- [ ] `atomic-timer` codeblock UI
- [ ] Hobby minutes → heatmap
- [ ] `atomic-hobby-library` + dashboard section
- [ ] Canvas guidance + optional `related_canvas`
- [ ] Security tests: path + log injection

## Track D — docs, E2E, security review

- [ ] USER_GUIDE full rewrite for Atomic domains
- [ ] AGENTS.md expectations
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`
- [ ] Dispatch security-review agent on phase diffs
- [ ] Manual Obsidian E2E checklist (or explicit Cloud skip)
- [ ] Update design spec status to implemented

## Definition of done (whole program)

1. Users can track Gym, Golf, and custom exercises with cues/dashboard/heatmaps
2. Users can track Reading (and custom hobbies) with item notes, remarks, and Start/Stop time
3. Notes remain Canvas-linkable markdown
4. Language PR merged or clearly sequenced
5. Legacy `fitness-*` migratable
6. Unit + security tests green; docs updated

## Agent execution rules (when implementation starts)

1. writing-plans → one plan file per phase track (A/B/C) or one plan with phase headings
2. Prefer subagent-driven-development: fresh subagent per task, review between tasks
3. For B parallel C after A: dispatching-parallel-agents with strict file ownership
4. Before any "done" claim: verification-before-completion (`npm test`, typecheck, build)
5. Obsidian GUI E2E only when available; otherwise note skip in PR
