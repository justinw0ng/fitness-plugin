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
