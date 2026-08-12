/** Book shelf geometry. Keep in sync with `--atomic-book-*` in styles.css. */

export const DEFAULT_BOOK_WIDTH_PX = 80;
export const DEFAULT_BOOK_HEIGHT_PX = 124;
export const MIN_BOOK_WIDTH_PX = 56;
export const BOOK_GAP_PX = 6;
/** Frame 4*2 + row 2*2 + books 4*2. */
export const ROW_PADDING_PX = 20;
export const MIN_BOOKS_PER_ROW = 3;

export function bookHeightForWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_BOOK_HEIGHT_PX;
  return Math.round((width * DEFAULT_BOOK_HEIGHT_PX) / DEFAULT_BOOK_WIDTH_PX);
}

/**
 * Shrink toward MIN_BOOK_WIDTH_PX so three books can sit on a narrow pane.
 * Never grow past DEFAULT_BOOK_WIDTH_PX.
 */
export function bookWidthForContainer(
  containerWidth: number,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
  minWidth = MIN_BOOK_WIDTH_PX,
  maxWidth = DEFAULT_BOOK_WIDTH_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return maxWidth;
  const available = Math.max(0, containerWidth - padding);
  const widthForMinCount =
    (available - (MIN_BOOKS_PER_ROW - 1) * gap) / MIN_BOOKS_PER_ROW;
  if (widthForMinCount >= maxWidth) return maxWidth;
  if (widthForMinCount >= minWidth) return Math.floor(widthForMinCount);
  return minWidth;
}

/**
 * How many upright books sit on one plank.
 * Never wraps below MIN_BOOKS_PER_ROW — overflow scrolls horizontally instead.
 */
export function booksPerRow(
  containerWidth: number,
  bookWidth = DEFAULT_BOOK_WIDTH_PX,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return MIN_BOOKS_PER_ROW;
  }
  const available = Math.max(0, containerWidth - padding);
  const fitted = Math.floor((available + gap) / (bookWidth + gap));
  return Math.max(MIN_BOOKS_PER_ROW, fitted);
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const rowSize = Math.max(1, Math.floor(size));
  if (!items.length) return [[]];
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += rowSize) {
    rows.push(items.slice(index, index + rowSize));
  }
  return rows;
}

export function rowNeedsHorizontalScroll(
  containerWidth: number,
  bookWidth = DEFAULT_BOOK_WIDTH_PX,
  gap = BOOK_GAP_PX,
  padding = ROW_PADDING_PX,
  minCount = MIN_BOOKS_PER_ROW,
): boolean {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return true;
  const needed = padding + minCount * bookWidth + (minCount - 1) * gap;
  return needed > containerWidth;
}

type WidthBox = {
  clientWidth: number;
  getBoundingClientRect?: () => { width: number };
  parentElement?: WidthBox | null;
};

/**
 * Walk up from a 0-width codeblock (common on iOS first paint) until a
 * positive width is found. Falls back to `fallbackWidth`.
 */
export function measureElementWidth(
  el: WidthBox | null | undefined,
  fallbackWidth = 0,
): number {
  let node: WidthBox | null | undefined = el;
  while (node) {
    const client = node.clientWidth;
    if (Number.isFinite(client) && client > 0) return client;
    const rectWidth = node.getBoundingClientRect?.().width;
    if (Number.isFinite(rectWidth) && (rectWidth ?? 0) > 0) return rectWidth ?? 0;
    node = node.parentElement;
  }
  return Number.isFinite(fallbackWidth) && fallbackWidth > 0 ? fallbackWidth : 0;
}
