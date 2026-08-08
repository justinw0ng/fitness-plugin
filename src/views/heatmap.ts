import type { VaultDataSource } from "../data/vault-source";
import { durationToLevel } from "../core";
import {
  addDays,
  formatYmd,
  fullDateZh,
  monthShortZh,
  parseYmd,
  weekdaySun0,
  ymdInZone,
} from "../dates";
import { EMPTY_CELL, type DayActivity, type SeriesConfig } from "../types";

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

function colorFor(series: SeriesConfig, level: number): string {
  if (!level) return EMPTY_CELL;
  return series.colors[level - 1] || series.colors[series.colors.length - 1];
}

function durationMap(
  data: VaultDataSource,
  series: SeriesConfig,
  year: number,
): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (const s of data.listSessions(series.folder, year)) {
    if (!s.date) continue;
    const entry = map.get(s.date) || { minutes: 0, path: null };
    entry.minutes += s.duration_min;
    if (!entry.path) entry.path = s.path;
    map.set(s.date, entry);
  }
  return map;
}

function renderOneHeatmap(
  root: HTMLElement,
  data: VaultDataSource,
  series: SeriesConfig,
  year: number,
  timezone: string,
): void {
  const wrap = root.createDiv({ cls: "fitness-heatmap" });
  wrap.createEl("h4", { cls: "fitness-heatmap-title", text: series.label });

  const legend = wrap.createDiv({ cls: "fitness-heatmap-legend" });
  legend.createSpan({ text: "Less / 少" });
  legend.createDiv({ cls: "fitness-legend-swatch" }).style.background =
    EMPTY_CELL;
  for (const c of series.colors) {
    const sw = legend.createDiv({ cls: "fitness-legend-swatch" });
    sw.style.background = c;
  }
  legend.createSpan({ text: "More / 多" });
  legend.createSpan({
    text: "by duration / 按時長",
    attr: { style: "margin-left:8px" },
  });

  const activityMap = durationMap(data, series, year);
  const todayStr = ymdInZone(new Date(), timezone);
  const start = { y: year, m: 1, d: 1 };
  const end = { y: year, m: 12, d: 31 };
  const jan1Dow = weekdaySun0(start.y, start.m, start.d);
  const daysToSubtract = jan1Dow; // Sunday-start grid
  let cursor = addDays(start.y, start.m, start.d, -daysToSubtract);

  type DayCell = {
    date: string;
    minutes: number;
    level: number;
    path: string | null;
    fullDate: string;
    isCurrentYear: boolean;
    isToday: boolean;
    y: number;
    m: number;
    d: number;
  };

  const weeks: DayCell[][] = [];
  let weekCount = 0;
  const endYmd = formatYmd(end.y, end.m, end.d);
  while (weekCount < 60) {
    // Match luxon heatmap: include weeks whose start date is still on/before Dec 31
    if (formatYmd(cursor.y, cursor.m, cursor.d) > endYmd) break;
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = formatYmd(cursor.y, cursor.m, cursor.d);
      const entry = activityMap.get(dateStr);
      const minutes = entry ? entry.minutes : 0;
      week.push({
        date: dateStr,
        minutes,
        level: durationToLevel(minutes),
        path: entry?.path ?? null,
        fullDate: fullDateZh(cursor.y, cursor.m, cursor.d),
        isCurrentYear: cursor.y === year,
        isToday: dateStr === todayStr,
        y: cursor.y,
        m: cursor.m,
        d: cursor.d,
      });
      cursor = addDays(cursor.y, cursor.m, cursor.d, 1);
    }
    weeks.push(week);
    weekCount++;
  }

  const monthRow = wrap.createDiv({ cls: "fitness-month-row" });
  let lastMonth = "";
  for (const week of weeks) {
    if (!week.length) continue;
    const first = week[0];
    const monthName = monthShortZh(first.y, first.m, first.d);
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

  const gridWrap = wrap.createDiv({ cls: "fitness-grid-wrap" });
  const dayLabels = gridWrap.createDiv({ cls: "fitness-day-labels" });
  for (const d of DAY_NAMES) {
    dayLabels.createDiv({ cls: "fitness-day-label", text: d });
  }

  const weeksEl = gridWrap.createDiv({ cls: "fitness-weeks" });
  for (const week of weeks) {
    const col = weeksEl.createDiv({ cls: "fitness-week" });
    for (const day of week) {
      const color = day.isCurrentYear
        ? colorFor(series, day.level)
        : EMPTY_CELL;
      const cell = col.createDiv({
        cls:
          "fitness-cell" +
          (day.isToday ? " is-today" : "") +
          (day.isCurrentYear ? "" : " is-faded") +
          (day.path ? " is-link" : ""),
      });
      cell.style.backgroundColor = color;
      const tip = day.path
        ? `${day.fullDate}: ${day.minutes} min / 分鐘 — click to open / 點擊開啟`
        : `${day.fullDate}: ${day.minutes} min / 分鐘`;
      cell.setAttr("title", tip);
      if (day.path) {
        const path = day.path;
        cell.addEventListener("click", (e) => {
          e.preventDefault();
          void data.openPath(path);
        });
      }
    }
  }
}

export function renderHeatmaps(
  el: HTMLElement,
  data: VaultDataSource,
  seriesList: SeriesConfig[],
  year: number,
  timezone: string,
): void {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  for (const s of seriesList) {
    renderOneHeatmap(root, data, s, year, timezone);
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
