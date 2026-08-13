/** Heatmap cell geometry. Keep in sync with `--atomic-heatmap-*` in styles.css. */

export const HEATMAP_CELL_PX = 11;
export const HEATMAP_GAP_PX = 1;
export const HEATMAP_DAY_LABEL_PX = 22;
export const HEATMAP_SCROLL_PAD_PX = 4;

export function heatmapWeeksWidth(weekCount: number): number {
  if (!Number.isFinite(weekCount) || weekCount <= 0) return 0;
  return (
    weekCount * HEATMAP_CELL_PX +
    (weekCount - 1) * HEATMAP_GAP_PX +
    HEATMAP_SCROLL_PAD_PX
  );
}

export function heatmapBodyMinWidth(weekCount: number): number {
  return HEATMAP_DAY_LABEL_PX + heatmapWeeksWidth(weekCount);
}

/** True when the year grid is wider than the pane and must scroll, not clip. */
export function heatmapNeedsHorizontalScroll(
  containerWidth: number,
  weekCount: number,
): boolean {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return true;
  return heatmapBodyMinWidth(weekCount) > containerWidth;
}
