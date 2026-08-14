import test from "node:test";
import assert from "node:assert/strict";
import { GREEN } from "../src/types.ts";
import {
  appendHeatmapWeeks,
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

function createPaintHost() {
  const created = [];
  function makeEl(className = "") {
    const el = {
      className,
      style: { backgroundColor: "" },
      dataset: {},
      children: [],
      createDiv(options = {}) {
        const child = makeEl(options.cls ?? "");
        for (const [key, value] of Object.entries(options.attr ?? {})) {
          if (key.startsWith("data-")) {
            const dataKey = key
              .slice(5)
              .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            child.dataset[dataKey] = String(value);
          }
        }
        this.children.push(child);
        return child;
      },
    };
    created.push(el);
    return el;
  }
  return { parent: makeEl(), created };
}

test("appendHeatmapWeeks paints cells with dataset hooks", () => {
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
  const { parent, created } = createPaintHost();
  appendHeatmapWeeks(
    parent,
    weeks,
    GREEN,
    "{date}: {minutes} min",
    "{date}: {minutes} min - click to open",
  );
  const today = created.find((el) => el.dataset.testid === "atomic-heatmap-today");
  const pad = created.find((el) => el.className === "fitness-weeks-end-pad");
  const todayWeek = created.find((el) => el.className.includes("is-today-week"));
  assert.ok(today);
  assert.ok(pad);
  assert.ok(todayWeek);
  assert.equal(today.dataset.path, 'atomics/exercise/Gym/2026/a"b.md');
  assert.equal(today.dataset.minutes, "30");
  assert.equal(parent.children.at(-1), pad);
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
