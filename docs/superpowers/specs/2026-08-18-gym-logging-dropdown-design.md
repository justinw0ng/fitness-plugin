# Design: Gym logging dropdown + exercise catalog

Date: 2026-08-18  
Status: implemented

## Goal

Keep gym sets as a markdown table, but stop requiring users to type rows by hand. Persist an exercise+muscle catalog, log sets from an in-note form, and offer a one-time upgrade setup that seeds the catalog from existing notes and inserts the new set log block.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Source of truth for sets | Existing gym markdown table (`Exercise \| Muscle \| Weight \| Reps \| Notes`) |
| Catalog storage | Plugin `data.json`: `gymExercises: { exercise, muscle }[]` |
| In-note UI | New codeblock `atomic-gym-log` (same pattern as `atomic-timer`) |
| New pair entry | Dropdown option **New exercise…** → modal (name + muscle) |
| Required set fields | Exercise pair, weight, reps. Notes optional |
| Table write | Fill the first empty template row, otherwise append |
| Upgrade vs new install | Existing `data.json` without `gymLogSetup` → pending prompt. Fresh install → `complete`, empty catalog, no prompt |
| Upgrade UX | Modal with release notes + **Set up now** / **Later**. Settings keeps **Import from gym notes** |
| Note migration | Insert `atomic-gym-log` above the set table on daily gym session notes. Skip `Cues.md`. Idempotent |

## Non-goals

- Replacing or hiding the markdown table
- Editing or deleting existing table rows from the widget
- Per-activity catalogs beyond `supportsSetTable` gym notes
- Rewriting historical muscle/exercise strings during import
