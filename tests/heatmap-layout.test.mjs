import test from "node:test";
import assert from "node:assert/strict";
import {
  effectiveHeatmapColumns,
  resolveHeatmapLayout,
} from "../src/util/heatmap-layout.ts";

test("resolveHeatmapLayout applies defaults", () => {
  assert.deepEqual(resolveHeatmapLayout({}), {
    rows: 1,
    columns: 1,
    minColumnWidth: 300,
    defaultSpan: 1.2,
  });
});

test("resolveHeatmapLayout parses hyphenated option keys", () => {
  assert.deepEqual(
    resolveHeatmapLayout({
      rows: "2",
      columns: "2",
      "min-column-width": "280",
      "default-span": "1.5",
    }),
    {
      rows: 2,
      columns: 2,
      minColumnWidth: 280,
      defaultSpan: 1.5,
    },
  );
});

test("resolveHeatmapLayout falls back on invalid or non-positive numbers", () => {
  assert.deepEqual(
    resolveHeatmapLayout({
      rows: "0",
      columns: "-1",
      "min-column-width": "abc",
      "default-span": "",
    }),
    {
      rows: 1,
      columns: 1,
      minColumnWidth: 300,
      defaultSpan: 1.2,
    },
  );
});

test("resolveHeatmapLayout floors integer options and keeps default-span fractional", () => {
  assert.deepEqual(
    resolveHeatmapLayout({
      rows: "2.9",
      columns: "3.1",
      "min-column-width": "280.8",
      "default-span": "1.75",
    }),
    {
      rows: 2,
      columns: 3,
      minColumnWidth: 280,
      defaultSpan: 1.75,
    },
  );
  assert.deepEqual(
    resolveHeatmapLayout({
      rows: "0.5",
      columns: "0.9",
    }),
    {
      rows: 1,
      columns: 1,
      minColumnWidth: 300,
      defaultSpan: 1.2,
    },
  );
});

test("effectiveHeatmapColumns is at least 1", () => {
  assert.equal(
    effectiveHeatmapColumns({
      columns: 4,
      minColumnWidth: 300,
      containerWidth: 0,
      activityCount: 0,
    }),
    1,
  );
});

test("effectiveHeatmapColumns respects columns, activity count, and width", () => {
  // 3×300 + 2×12 gap needs 924px; 900px fits two columns.
  assert.equal(
    effectiveHeatmapColumns({
      columns: 4,
      minColumnWidth: 300,
      containerWidth: 900,
      activityCount: 3,
    }),
    2,
  );
  assert.equal(
    effectiveHeatmapColumns({
      columns: 4,
      minColumnWidth: 300,
      containerWidth: 924,
      activityCount: 3,
    }),
    3,
  );
  assert.equal(
    effectiveHeatmapColumns({
      columns: 4,
      minColumnWidth: 300,
      containerWidth: 650,
      activityCount: 4,
    }),
    2,
  );
  // 2×300 + 12 gap needs 612px; just under wraps to one column.
  assert.equal(
    effectiveHeatmapColumns({
      columns: 4,
      minColumnWidth: 300,
      containerWidth: 611,
      activityCount: 4,
    }),
    1,
  );
  assert.equal(
    effectiveHeatmapColumns({
      columns: 4,
      minColumnWidth: 300,
      containerWidth: 612,
      activityCount: 4,
    }),
    2,
  );
  assert.equal(
    effectiveHeatmapColumns({
      columns: 2,
      minColumnWidth: 300,
      containerWidth: 1200,
      activityCount: 4,
    }),
    2,
  );
});
