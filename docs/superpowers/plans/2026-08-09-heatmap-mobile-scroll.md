# Heatmap mobile scroll — Implementation Plan

> **For agentic workers:** Implement task-by-task. Prefer TDD for pure modules. Checkboxes track progress.

**Goal:** When `atomic-heatmap` overflows, allow horizontal scroll of months + weeks with pinned day labels; if today is in that year, initially align today’s week to the right edge of the scrollport.

**Spec:** `docs/superpowers/specs/2026-08-09-heatmap-mobile-scroll-design.md`

**Architecture:** Pure scroll-math helper + heatmap DOM/CSS restructure so day labels sit outside a shared `overflow-x: auto` scrollport containing month row + week columns. Wire initial `scrollLeft` (and resize until user scrolls) in `renderOneHeatmap`.

**Tech Stack:** TypeScript, Obsidian codeblock views, Node test runner, esbuild.

**Agent roles (locked for this work):**

| Role | Model |
|------|--------|
| Orchestration / plan / reviews | Grok 4.5 |
| Implementation | Composer 2.5 only |
| Validation / testing | Grok 4.5 |

## Global constraints

- Overflow-only: no media-query-only scroll mode
- Past years / today not in year → `scrollLeft = 0`
- Today alignment = right edge of **today’s week column**, not `scrollWidth` max
- Day labels outside scrollport; month row must not have its own independent `overflow-x`
- No new settings, codeblock options, or i18n keys
- Every task: relevant tests green; before done: `npm test`, `npm run typecheck`, `npm run build`
- `git checkout -- main.js` unless intentionally shipping the bundle

---

## Task 1: Pure scroll-left helper + unit tests (TDD)

**Files:**
- Create: `src/util/heatmap-scroll.ts`, `tests/heatmap-scroll.test.mjs`

**Helper API:**

```ts
export function scrollLeftToAlignRight(
  scrollWidth: number,
  clientWidth: number,
  targetRightPx: number,
): number
```

**Behavior:**

- If `scrollWidth <= clientWidth` → `0`
- Else `clamp(targetRightPx - clientWidth, 0, scrollWidth - clientWidth)`
- Treat non-finite / negative sizes as `0` result (defensive)

**Steps:**

- [x] Write failing tests: mid-year target, no overflow, clamp past max, clamp below 0, equal widths
- [x] Implement helper until green
- [x] Commit

---

## Task 2: Heatmap DOM scrollport + CSS

**Files:**
- Modify: `src/views/heatmap.ts`, `styles.css`

**DOM (per heatmap, after legend):**

```
.fitness-heatmap-body (flex row)
  .fitness-day-labels
  .fitness-heatmap-scroll (overflow-x: auto)
    .fitness-month-row
    .fitness-weeks
```

**Steps:**

- [x] Move month row + weeks into `.fitness-heatmap-scroll`
- [x] Keep day labels as sibling outside the scrollport
- [x] Mark today’s week column (e.g. class `is-today-week` or data attr) for alignment
- [x] CSS: scrollport `overflow-x: auto`; remove standalone `overflow-x` from `.fitness-month-row`
- [x] Ensure month spacers/labels still align with week column width (18px / cell+gap)
- [x] Commit (`git checkout -- main.js` if build dirty)

---

## Task 3: Initial scroll + resize (respect user scroll)

**Files:**
- Modify: `src/views/heatmap.ts`
- Optionally extend: `tests/heatmap-scroll.test.mjs` if extracting more pure bits

**Steps:**

- [ ] After mount, if any cell/week is today in-year: measure today’s week `offsetLeft + offsetWidth` as `targetRightPx`, set `scrollLeft` via helper
- [ ] If no today in year: leave at `0`
- [ ] `ResizeObserver` (or window resize fallback) on scrollport: re-apply while `userHasScrolled === false`
- [ ] On `scroll` event: if delta from programmatic set, set `userHasScrolled = true` and stop re-applying
- [ ] Avoid feedback loops: ignore scroll events caused by the programmatic assign (flag or compare expected)
- [ ] Commit

---

## Task 4: Verify + ship

**Files:**
- Possibly: `main.js` if shipping runtime change

**Steps:**

- [ ] `npm test`, `npm run typecheck`, `npm run build`
- [ ] Commit built `main.js` if heatmap runtime changed
- [ ] Manual E2E when Obsidian available (narrow pane / mobile): overflow scroll, today right-aligned, past year left, labels pinned, stacked heatmaps independent
- [ ] Update PR

---

## Done when

1. Narrow viewports can pan the year heatmap horizontally
2. Day labels stay fixed while months/weeks scroll together
3. Current-year first paint puts today at the right edge when overflowing
4. Other years stay at left; no overflow → no forced scroll
5. User scroll is not overridden until re-render
6. Tests, typecheck, build pass
