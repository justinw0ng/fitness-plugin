# Design: Heatmap horizontal scroll + default to today

Date: 2026-08-09  
Status: approved (pending implementation)  
Related: `src/views/heatmap.ts`, `styles.css`

## Goal

When an `atomic-heatmap` year grid is wider than its container (phone, narrow pane, split view):

1. Allow **horizontal scrolling** of the month labels + week cells.
2. On first paint, if **today** is in that year, scroll so **today’s week sits at the right edge** of the viewport. The user can then scroll left for history (and right for later weeks in the year).

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| When scrolling applies | Only when content overflows (not media-query-only) |
| Past / other years | No auto-scroll; leave at start (left) |
| Weekday labels | Stay pinned on the left; only months + weeks scroll |
| Today alignment | Today’s week column flush to the **right edge** of the scrollport (not “scroll to max”) |
| Stacked heatmaps | Each activity heatmap has its own scrollport and initial scroll |
| After user scrolls | Do not reset scroll back to today for that render |
| Truncating the year on mobile | Out of scope |

## Approaches considered

### Approach 1 — Single scrollport, sticky day labels (chosen)

Wrap month row + week columns in one `overflow-x: auto` container. Keep day labels **outside** that container so they do not scroll. Compute `scrollLeft` so today’s week aligns to the right edge when today is in-year and content overflows.

### Approach 2 — `scrollIntoView` / scroll-snap only

Smaller change, but month/grid can desync and day labels tend to scroll away unless sticky layout is added anyway.

### Approach 3 — Show only recent weeks on narrow widths

Avoids scroll, but changes the year-heatmap product. Rejected for this request.

## Layout

Per heatmap (title + legend stay full width, not scrolled):

```
[ day labels ] [ scrollport: month row ]
               [ scrollport: week columns ]
```

- Day labels remain visible while the user pans horizontally.
- Month labels and week columns share one scrollport so they stay column-aligned.
- `overflow-x: auto` — no behavioral change when the full year fits.

## Initial scroll

After DOM for one heatmap is built:

1. If today is **not** in the rendered year → `scrollLeft = 0`.
2. If content does **not** overflow → `scrollLeft = 0`.
3. Otherwise set `scrollLeft` so the **right edge** of today’s week column aligns with the **right edge** of the scrollport (clamp to `[0, scrollWidth - clientWidth]`).

Future weeks in the current year may sit off-screen to the right until the user scrolls.

### Resize / re-render

- On container resize before the user has scrolled this instance: re-apply the same today-at-right rule when today is in-year and overflow exists.
- After the user manually scrolls: do not yank the position back.
- Obsidian codeblock re-renders recreate the DOM; a fresh instance may auto-scroll to today again (acceptable).

## Implementation sketch

| Area | Change |
|------|--------|
| `src/views/heatmap.ts` | Restructure DOM for scrollport + day labels; mark today week; call scroll helper after mount |
| `styles.css` | Scrollport styles; drop standalone `overflow-x` on the month row (months scroll only via the shared scrollport) |
| Pure helper (e.g. in `src/core` or a small util) | `scrollLeftToAlignRight(scrollWidth, clientWidth, targetRightPx) → number` |

No new settings, codeblock options, or i18n keys.

## Testing

**Unit**

- Scroll math: today near mid-year → expected `scrollLeft`; no overflow → `0`; target past max → clamped; past year / no today target → `0`.

**Manual (Obsidian)**

1. Narrow pane or mobile: year heatmap scrolls horizontally; day labels stay put.
2. Current-year heatmap: first paint shows today at the right edge.
3. Past-year heatmap (`year: 2024` or similar): starts at left; no auto-jump.
4. Wide desktop: no unnecessary scroll chrome when the grid fits.
5. Multi-activity stack: each heatmap scrolls independently with the same rules.

## Out of scope

- Changing cell size, colors, or year span
- Scroll-snap or page-style paging by month
- Vertical scroll changes
- Persisting scroll position across note reloads
