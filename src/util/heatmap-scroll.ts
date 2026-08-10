/**
 * Compute scrollLeft so that targetRightPx aligns with the right edge of the scrollport.
 * Returns 0 when content does not overflow or inputs are invalid.
 */
export function scrollLeftToAlignRight(
  scrollWidth: number,
  clientWidth: number,
  targetRightPx: number,
): number {
  if (
    !Number.isFinite(scrollWidth) ||
    !Number.isFinite(clientWidth) ||
    !Number.isFinite(targetRightPx) ||
    scrollWidth < 0 ||
    clientWidth < 0
  ) {
    return 0;
  }

  if (scrollWidth <= clientWidth) {
    return 0;
  }

  const maxScrollLeft = scrollWidth - clientWidth;
  const desired = targetRightPx - clientWidth;
  return Math.min(Math.max(desired, 0), maxScrollLeft);
}
