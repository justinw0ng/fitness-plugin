export type HeatmapLayout = {
  rows: number;
  columns: number;
  minColumnWidth: number;
  defaultSpan: number;
};

const DEFAULT_ROWS = 1;
const DEFAULT_COLUMNS = 1;
const DEFAULT_MIN_COLUMN_WIDTH = 300;
const DEFAULT_DEFAULT_SPAN = 1.2;

function parsePositiveNumber(
  value: string | undefined,
  defaultValue: number,
): number {
  if (!value) return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return n;
}

export function resolveHeatmapLayout(
  opts: Record<string, string>,
): HeatmapLayout {
  return {
    rows: parsePositiveNumber(opts.rows, DEFAULT_ROWS),
    columns: parsePositiveNumber(opts.columns, DEFAULT_COLUMNS),
    minColumnWidth: parsePositiveNumber(
      opts["min-column-width"],
      DEFAULT_MIN_COLUMN_WIDTH,
    ),
    defaultSpan: parsePositiveNumber(
      opts["default-span"],
      DEFAULT_DEFAULT_SPAN,
    ),
  };
}

export function effectiveHeatmapColumns(params: {
  columns: number;
  minColumnWidth: number;
  containerWidth: number;
  activityCount: number;
}): number {
  const { columns, minColumnWidth, containerWidth, activityCount } = params;
  if (activityCount <= 0) return 1;
  const widthBased = Math.max(
    1,
    Math.floor(containerWidth / minColumnWidth),
  );
  return Math.min(columns, activityCount, widthBased);
}
