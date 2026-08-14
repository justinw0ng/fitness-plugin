import type { VaultDataSource } from "../data/vault-source";
import { monthShortForLanguage, parseYmd, ymdInZone } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import { EMPTY_CELL, type ActivityType, type DayActivity } from "../types";
import { resolveHeatmapActivities } from "../util/heatmap-activities";
import {
  effectiveHeatmapColumns,
  resolveHeatmapLayout,
  type HeatmapLayout,
} from "../util/heatmap-layout";
import {
  buildHeatmapWeeks,
  heatmapActivityKey,
  heatmapDomIsPainted,
  heatmapLayoutKey,
  heatmapWeeksHtml,
  sameHeatmapPaintState,
  type HeatmapPaintState,
} from "../util/heatmap-model";
import { measureElementWidth } from "../util/element-width";
import { scrollLeftToAlignRight } from "../util/heatmap-scroll";

type HeatmapObserverRegistry = {
  scrolls: ResizeObserver[];
  grid?: ResizeObserver;
};

const heatmapObserverRegistry = new WeakMap<HTMLElement, HeatmapObserverRegistry>();
const heatmapPaintState = new WeakMap<HTMLElement, HeatmapPaintState>();

function cleanupHeatmapObservers(container: HTMLElement): void {
  const registry = heatmapObserverRegistry.get(container);
  if (!registry) return;
  for (const observer of registry.scrolls) observer.disconnect();
  registry.grid?.disconnect();
  heatmapObserverRegistry.delete(container);
}

const DAY_NAMES: Record<Language, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "zh-Hant-en": ["日", "一", "二", "三", "四", "五", "六"],
};

function wireHeatmapScroll(
  scrollEl: HTMLElement,
  registry: HeatmapObserverRegistry,
): void {
  let userHasScrolled = false;
  let expectedScrollLeft: number | null = null;

  const applyTodayAlign = () => {
    const todayWeek = scrollEl.querySelector<HTMLElement>(".is-today-week");
    if (!todayWeek) return;

    const targetRightPx =
      todayWeek.getBoundingClientRect().right -
      scrollEl.getBoundingClientRect().left +
      scrollEl.scrollLeft;
    const nextScrollLeft = scrollLeftToAlignRight(
      scrollEl.scrollWidth,
      scrollEl.clientWidth,
      targetRightPx,
    );

    expectedScrollLeft = nextScrollLeft;
    scrollEl.scrollLeft = nextScrollLeft;
  };

  scrollEl.addEventListener(
    "scroll",
    () => {
      if (
        expectedScrollLeft !== null &&
        Math.abs(scrollEl.scrollLeft - expectedScrollLeft) < 1
      ) {
        expectedScrollLeft = null;
        return;
      }
      userHasScrolled = true;
    },
    { passive: true },
  );

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      if (userHasScrolled) return;
      window.requestAnimationFrame(() => {
        if (!userHasScrolled) applyTodayAlign();
      });
    });
    resizeObserver.observe(scrollEl);
    registry.scrolls.push(resizeObserver);
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!userHasScrolled) applyTodayAlign();
    });
  });
}

function wireHeatmapCellClicks(weeksEl: HTMLElement, data: VaultDataSource): void {
  weeksEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const cell = target.closest(".fitness-cell.is-link");
    const path = cell?.getAttribute("data-path");
    if (!path) return;
    event.preventDefault();
    void data.openPath(path);
  });
}

function renderOneHeatmap(
  root: HTMLElement,
  data: VaultDataSource,
  activity: ActivityType,
  year: number,
  timezone: string,
  language: Language,
  registry: HeatmapObserverRegistry,
  activityMap: Map<string, DayActivity>,
): void {
  const wrap = root.createDiv({
    cls: "fitness-heatmap",
    attr: {
      "data-testid": "atomic-heatmap",
      "data-activity": activity.id,
    },
  });
  wrap.createEl("h4", { cls: "fitness-heatmap-title", text: activity.label });

  const legend = wrap.createDiv({ cls: "fitness-heatmap-legend" });
  legend.createSpan({ text: t("view.heatmap.less", language) });
  legend.createDiv({ cls: "fitness-legend-swatch" }).style.background =
    EMPTY_CELL;
  for (const c of activity.colors) {
    const sw = legend.createDiv({ cls: "fitness-legend-swatch" });
    sw.style.background = c;
  }
  legend.createSpan({ text: t("view.heatmap.more", language) });
  legend.createSpan({
    text: t("view.heatmap.byDuration", language),
    attr: { style: "margin-left:8px" },
  });

  const weeks = buildHeatmapWeeks({
    year,
    todayStr: ymdInZone(new Date(), timezone),
    language,
    activityMap,
  });

  const body = wrap.createDiv({ cls: "fitness-heatmap-body" });
  const dayLabels = body.createDiv({ cls: "fitness-day-labels" });
  for (const d of DAY_NAMES[language]) {
    dayLabels.createDiv({ cls: "fitness-day-label", text: d });
  }

  const scroll = body.createDiv({ cls: "fitness-heatmap-scroll" });
  const monthRow = scroll.createDiv({ cls: "fitness-month-row" });
  let lastMonth = "";
  for (const week of weeks) {
    if (!week.length) continue;
    const first = week[0];
    const monthName = monthShortForLanguage(first.y, first.m, first.d, language);
    if (monthName !== lastMonth && first.d <= 7 && first.isCurrentYear) {
      monthRow.createDiv({ cls: "fitness-month-label", text: monthName });
      lastMonth = monthName;
    } else if (monthName !== lastMonth && first.d <= 7) {
      monthRow.createDiv({ cls: "fitness-month-label", text: monthName });
      lastMonth = monthName;
    } else {
      monthRow.createDiv({ cls: "fitness-month-spacer" });
    }
  }

  const weeksEl = scroll.createDiv({ cls: "fitness-weeks" });
  weeksEl.innerHTML = heatmapWeeksHtml(
    weeks,
    activity.colors,
    t("view.heatmap.tooltip", language),
    t("view.heatmap.tooltipOpen", language),
  );
  wireHeatmapCellClicks(weeksEl, data);
  wireHeatmapScroll(scroll, registry);
}

function wireHeatmapGrid(
  gridEl: HTMLElement,
  layout: HeatmapLayout,
  activityCount: number,
  registry: HeatmapObserverRegistry,
): void {
  // Preferred / documented NxM capacity; implicit rows still grow as needed.
  gridEl.style.gridTemplateRows = `repeat(${layout.rows}, auto)`;

  const applyColumns = () => {
    const fallback =
      typeof window !== "undefined" && Number.isFinite(window.innerWidth)
        ? window.innerWidth
        : layout.minColumnWidth;
    const columnCount = effectiveHeatmapColumns({
      columns: layout.columns,
      minColumnWidth: layout.minColumnWidth,
      containerWidth: measureElementWidth(gridEl, fallback),
      activityCount,
    });
    gridEl.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, ${layout.defaultSpan}fr))`;
  };

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(applyColumns);
    });
    resizeObserver.observe(gridEl);
    registry.grid = resizeObserver;
  }

  applyColumns();
}

export async function renderHeatmaps(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  timezone: string,
  language: Language,
  activityOption?: string,
  layoutOptions?: Record<string, string>,
): Promise<void> {
  const layout = resolveHeatmapLayout(layoutOptions ?? {});
  const { activities, invalidIds } = resolveHeatmapActivities(
    activityTypes,
    activityOption,
  );
  const maps = await Promise.all(
    activities.map((activity) => data.getActivityDurationMap(activity, year)),
  );
  const paintState: HeatmapPaintState = {
    year,
    timezone,
    language,
    layoutKey: heatmapLayoutKey(layout),
    activityKey: heatmapActivityKey(activities),
    invalidIds,
    maps,
  };
  if (
    heatmapDomIsPainted(el) &&
    sameHeatmapPaintState(heatmapPaintState.get(el), paintState)
  ) {
    return;
  }

  cleanupHeatmapObservers(el);
  el.empty();
  heatmapPaintState.set(el, paintState);
  const registry: HeatmapObserverRegistry = { scrolls: [] };
  heatmapObserverRegistry.set(el, registry);

  const root = el.createDiv({ cls: "fitness-plugin" });
  if (invalidIds.length > 0) {
    root.createEl("p", {
      text: t("view.heatmap.invalidActivities", language, {
        ids: invalidIds.join(", "),
      }),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-invalid" },
    });
  }
  if (activities.length === 0 && invalidIds.length === 0) {
    root.createEl("p", {
      text: t("view.heatmap.noActivities", language),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-empty" },
    });
    return;
  }

  const useGrid = activities.length > 1 && layout.columns > 1;
  const heatmapParent = useGrid
    ? root.createDiv({ cls: "fitness-heatmap-grid" })
    : root;

  for (let i = 0; i < activities.length; i++) {
    renderOneHeatmap(
      heatmapParent,
      data,
      activities[i],
      year,
      timezone,
      language,
      registry,
      maps[i],
    );
  }

  if (useGrid) {
    wireHeatmapGrid(heatmapParent, layout, activities.length, registry);
  }
}

export function resolveHeatmapYear(
  opts: Record<string, string>,
  sourcePath: string,
  timezone: string,
): number {
  if (opts.year && Number(opts.year)) return Number(opts.year);
  const fromPath = parseYmd(
    sourcePath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "",
  );
  if (fromPath) return fromPath.y;
  return Number(ymdInZone(new Date(), timezone).slice(0, 4));
}
