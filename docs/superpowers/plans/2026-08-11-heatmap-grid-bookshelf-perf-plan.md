# Implementation plan: heatmap grid, book shelf polish, mobile performance

## Task 1 — Parse block options (hyphens + comments)

**Files:** `src/util/parse-block.ts`, `tests/parse-block.test.mjs` (new or extend)

- Allow keys: `[A-Za-z_][A-Za-z0-9_-]*`
- Strip trailing ` # ...` comments from values
- Skip full-line `#` comments
- Tests: `min-column-width: 300`, `rows: 2 # default: 1`, quoted values still work

## Task 2 — Heatmap layout options + grid

**Files:** `src/util/heatmap-layout.ts` (new pure helpers), `src/views/heatmap.ts`, `src/codeblocks.ts`, `styles.css`, `tests/heatmap-layout.test.mjs`, docs

- `resolveHeatmapLayout(opts)` → `{ rows, columns, minColumnWidth, defaultSpan }` with defaults `1, 1, 300, 1.2`
- `effectiveHeatmapColumns({ columns, minColumnWidth, containerWidth, activityCount })`
- `renderHeatmaps` accepts layout; wraps multi-activity output in `.fitness-heatmap-grid` when `columns > 1` or activity count > 1 with columns > 1
- ResizeObserver updates `--atomic-heatmap-columns` / grid-template-columns; disconnect on re-render
- CSS for `.fitness-heatmap-grid` gap and track sizing using `default-span`
- Wire options from `codeblocks.ts`
- Document in USER_GUIDE + README

## Task 3 — Book shelf radius + density

**Files:** `styles.css`, `src/views/book-shelf.ts`, `tests/book-shelf.test.mjs`

- Match cover image radius to face; fix hinge offset
- Reduce frame/row paddings per design table; update `ROW_PADDING_PX` to `24`
- Update `booksPerRow` tests for new padding

## Task 4 — Performance

**Files:** `src/main.ts`, `src/data/vault-source.ts`, `src/util/vault-list-cache.ts` (new), `src/views/heatmap.ts`, `styles.css`, tests

- Path-gated `scheduleRefresh`; soften/remove blanket `metadataCache.resolved` refresh
- Debounce 300ms; `Promise.all` in `refreshAll`
- Heatmap ResizeObserver WeakMap cleanup
- Cache listSessions / listHobbyItems with invalidation
- CSS `contain` on heavy roots

## Task 5 — Verify

- `npm test`, `npm run typecheck`, `npm run build`
- Obsidian E2E when available
- Commit `main.js` only if release process expects it; otherwise restore after build per AGENTS.md
