# Heatmap grid layout, book shelf polish, and mobile performance

## Problem

1. Book shelf cover corners do not match the rounded sleeve/face, leaving a thin gap at the tips.
2. Multiple `atomic-heatmap` activities currently stack in one column. Users fall back to Multi-Column Markdown for a 2×2 layout and lose responsive wrap on phones.
3. Book shelf side and top padding leave large empty gutters; fewer than three books fit before wrapping in narrow panes.
4. Notes with many `atomic-*` blocks feel laggy on mobile (e.g. Pixel 9 Pro) because every vault/metadata event re-renders every live block and heatmaps leak ResizeObservers.

## Goals

- Align book cover face / image radius with the sleeve volume.
- Add optional heatmap multi-activity grid options with responsive wrap.
- Tighten book shelf frame padding so at least three books fit on a typical mobile content width by default.
- Cut redundant re-renders and observer churn for all `atomic-*` blocks on mobile.

## Non-goals

- Replacing Obsidian Multi-Column Markdown for unrelated content.
- Changing heatmap cell geometry (16×16 dots) or year/week model.
- New settings UI for these options (codeblock options only).

## Approaches considered

### Heatmap multi-activity layout

1. **Recommended: options on one `atomic-heatmap` block + CSS grid**  
   Keep `activity: gym, golf, reading, guitar` and add `rows`, `columns`, `min-column-width`, `default-span`. Lay out one heatmap per activity in a responsive grid. No Multi-Column dependency; wraps when the pane is narrower than `columns × min-column-width`.
2. Auto-detect sibling heatmap blocks and merge them — fragile with preview DOM and editing.
3. Depend on Multi-Column Markdown — does not solve phone wrap and adds a marketplace dependency.

### Performance

1. **Recommended: smarter refresh + observer cleanup + short-lived list cache**  
   Debounce longer, skip refreshes when the changed path cannot affect Atomic data, disconnect heatmap ResizeObservers on re-render, cache `listSessions` / `listHobbyItems` briefly, render live blocks in parallel.
2. Full vault index service — larger rewrite than this change needs.
3. Virtualize heatmap cells — high complexity for ~370 dots per activity.

## Design

### 1. Book cover radius alignment

- Give `.atomic-book-cover-image` the same `border-radius` as `.atomic-book-cover-face` (`3px 4px 4px 3px`).
- Keep `overflow: hidden` on the face so the image is clipped to that radius.
- Remove the cover-face `left: -1px` hinge overlap (or replace with a non-radius-breaking clip) so corners of face and pages/volume stay concentric.
- Keep spine-side asymmetry (`3px` left / `4px` right) consistent across pages, cover face, inside, and spine.

### 2. Heatmap grid options

Extend `parseBlockOptions` so keys may include hyphens (`min-column-width`) and trailing `# comments` are stripped from values (and ignored full-line comments).

New options on `atomic-heatmap` (all optional):

| Option | Default | Meaning |
|--------|---------|---------|
| `rows` | `1` | Preferred / max row count for the multi-activity grid |
| `columns` | `1` | Max column count (1 = current vertical stack) |
| `min-column-width` | `300` | Minimum px width before a column wraps to the next row |
| `default-span` | `1.2` | CSS `fr` weight for each grid track (`minmax(min-column-width, default-span fr)` capped by `columns`) |

Behavior:

- Single activity: options are accepted but layout is unchanged (one heatmap).
- Multiple activities with `columns: 1` (default): stack vertically (backward compatible).
- Multiple activities with `columns > 1`: wrap heatmaps in `.fitness-heatmap-grid`. Effective column count is  
  `min(columns, activities.length, max(1, floor(containerWidth / min-column-width)))`.  
  Row count grows as needed; `rows` sets preferred `grid-template-rows` capacity / max auto rows hint and is documented for NxM layouts (e.g. `rows: 2` + `columns: 2` for four activities).
- On resize, recompute effective columns (ResizeObserver on the grid, disconnected on re-render).
- Invalid / non-positive numbers fall back to defaults.

Example:

````markdown
```atomic-heatmap
activity: gym, golf, reading, guitar
rows: 2              # default: 1
columns: 2           # default: 1
min-column-width: 300  # default: 300
default-span: 1.2      # default: 1.2
```
````

### 3. Book shelf density

| Token | Current | New |
|-------|---------|-----|
| Frame padding | `72px 16px 8px` | `48px 6px 8px` |
| Row horizontal padding | `0 4px 20px` | `0 2px 16px` |
| Books row padding | `0 8px` | `0 4px` |
| `ROW_PADDING_PX` (TS) | `56` | `24` (`6*2 + 2*2 + 4*2`) |

Keep book face `108×168` and gap `8px`. With `ROW_PADDING_PX = 24`, three books need `3*108 + 2*8 + 24 = 364px` content width — fits typical phone preview panes where the old 396px threshold did not.

Hover title bubble still has room with `48px` top padding plus existing `overflow: visible` / bubble positioning; if bubble clips in E2E, raise top padding slightly without restoring side gutters.

### 4. Performance (all `atomic-*`)

1. **Refresh gating** — On vault `modify` / `delete` / `rename` / `create`, only schedule refresh when the path is under a configured Atomic folder (`atomics/` or activity folders) or is a note that currently hosts live blocks. Ignore unrelated vault churn from `metadataCache.on("resolved")` unless a tracked live-block sourcePath’s cache changed; prefer vault file events over blanket `resolved`.
2. **Debounce** — Keep debounce; use ~300ms (slightly longer than 200ms) to coalesce bursty mobile I/O.
3. **Observer cleanup** — Store heatmap scroll ResizeObservers in a WeakMap (same pattern as book shelf); disconnect before `el.empty()` / re-render.
4. **List scan cache** — Short-lived in-memory cache for `listSessions(folder, year)` and `listHobbyItems(activity)` keyed by folder/activity + metadata generation or mtime watermark; invalidate on relevant vault events (reuse hobby time-log invalidation hooks).
5. **Parallel live refresh** — `refreshAll` renders connected live blocks with `Promise.all` instead of a serial `await` loop.
6. **CSS containment** — `contain: layout paint` (and `content-visibility: auto` where safe) on `.fitness-heatmap` and `.atomic-book-shelf` roots to limit style/layout thrash on long notes.

## Testing

- Unit: hyphen + comment parsing; heatmap layout option defaults/clamping; `booksPerRow` with new padding; list-cache hit/invalidate.
- Existing heatmap activity / book shelf / codeblock tests still pass.
- Manual Obsidian E2E: multi-activity 2×2 grid wraps on narrow width; book corners align; three books on one shelf row; dashboard note with many blocks stays responsive after edits.

## Docs

- Update `docs/USER_GUIDE.md` and `README.md` heatmap examples with the new options (including `# default` comments).
- Mention denser book shelf padding briefly if the guide discusses layout.
