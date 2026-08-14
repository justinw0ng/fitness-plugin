import test from "node:test";
import assert from "node:assert/strict";
import { GREEN } from "../src/types.ts";
import {
  buildHeatmapWeeks,
  escapeHtmlAttr,
  formatHeatmapTooltip,
  heatmapDomIsPainted,
  heatmapWeeksHtml,
  sameHeatmapPaintState,
} from "../src/util/heatmap-model.ts";

test("buildHeatmapWeeks marks today and session minutes", () => {
  const activityMap = new Map([
    ["2026-01-01", { minutes: 45, path: "atomics/exercise/Gym/2026/2026-01-01.md" }],
  ]);
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-01-01",
    language: "en",
    activityMap,
  });
  const days = weeks.flat();
  const today = days.find((day) => day.isToday && day.isCurrentYear);
  assert.ok(today);
  assert.equal(today.minutes, 45);
  assert.equal(today.path, "atomics/exercise/Gym/2026/2026-01-01.md");
  assert.equal(today.level, 2);
  assert.ok(weeks.length >= 52);
  assert.ok(weeks.length <= 54);
});

test("heatmapWeeksHtml keeps cell hooks and escapes attributes", () => {
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-01-01",
    language: "en",
    activityMap: new Map([
      [
        "2026-01-01",
        {
          minutes: 30,
          path: 'atomics/exercise/Gym/2026/a"b.md',
        },
      ],
    ]),
  });
  const html = heatmapWeeksHtml(
    weeks,
    GREEN,
    "{date}: {minutes} min",
    "{date}: {minutes} min - click to open",
  );
  assert.match(html, /data-testid="atomic-heatmap-today"/);
  assert.match(html, /data-testid="atomic-heatmap-cell"/);
  assert.match(html, /data-path="atomics\/exercise\/Gym\/2026\/a&quot;b.md"/);
  assert.match(html, /is-today-week/);
  assert.match(html, /fitness-weeks-end-pad/);
});

test("escapeHtmlAttr and tooltip formatting stay literal", () => {
  assert.equal(escapeHtmlAttr(`a&b"c<d>`), "a&amp;b&quot;c&lt;d&gt;");
  assert.equal(
    formatHeatmapTooltip("{date}: {minutes} min", "Jan 1, 2026", 12),
    "Jan 1, 2026: 12 min",
  );
});

test("sameHeatmapPaintState reuses identical duration maps", () => {
  const map = new Map();
  const state = {
    year: 2026,
    timezone: "UTC",
    language: "en",
    layoutKey: "1:1:300:1.2",
    activityKey: "gym",
    invalidIds: [],
    maps: [map],
  };
  assert.equal(sameHeatmapPaintState(state, { ...state, maps: [map] }), true);
  assert.equal(sameHeatmapPaintState(state, { ...state, maps: [new Map()] }), false);
  assert.equal(
    heatmapDomIsPainted({
      querySelector: (sel) => (sel.includes("atomic-heatmap") ? {} : null),
    }),
    true,
  );
});
