// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { durationToLevel } from "../core.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { addDays, formatYmd, fullDateForLanguage, weekdaySun0 } from "../dates.ts";
import type { Language } from "../i18n/types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { EMPTY_CELL, type DayActivity } from "../types.ts";

export type HeatmapDayCell = {
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

export type HeatmapPaintState = {
  year: number;
  timezone: string;
  language: Language;
  layoutKey: string;
  activityKey: string;
  invalidIds: string[];
  maps: Array<Map<string, DayActivity>>;
};

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatHeatmapTooltip(
  template: string,
  date: string,
  minutes: number,
): string {
  return template
    .split("{date}")
    .join(date)
    .split("{minutes}")
    .join(String(minutes));
}

export function heatmapLayoutKey(layout: {
  rows: number;
  columns: number;
  minColumnWidth: number;
  defaultSpan: number;
}): string {
  return `${layout.rows}:${layout.columns}:${layout.minColumnWidth}:${layout.defaultSpan}`;
}

export function heatmapActivityKey(
  activities: Array<{ id: string; label: string; colors: readonly string[] }>,
): string {
  return activities
    .map((activity) => `${activity.id}\0${activity.label}\0${activity.colors.join(",")}`)
    .join("|");
}

export function sameHeatmapPaintState(
  previous: HeatmapPaintState | undefined,
  next: HeatmapPaintState,
): boolean {
  if (!previous) return false;
  return (
    previous.year === next.year &&
    previous.timezone === next.timezone &&
    previous.language === next.language &&
    previous.layoutKey === next.layoutKey &&
    previous.activityKey === next.activityKey &&
    previous.invalidIds.length === next.invalidIds.length &&
    previous.invalidIds.every((id, i) => id === next.invalidIds[i]) &&
    previous.maps.length === next.maps.length &&
    previous.maps.every((map, i) => map === next.maps[i])
  );
}

export function heatmapDomIsPainted(el: { querySelector: (sel: string) => unknown }): boolean {
  return !!el.querySelector(
    '[data-testid="atomic-heatmap"], [data-testid="atomic-heatmap-empty"], [data-testid="atomic-heatmap-invalid"]',
  );
}

export function buildHeatmapWeeks(params: {
  year: number;
  todayStr: string;
  language: Language;
  activityMap: Map<string, DayActivity>;
}): HeatmapDayCell[][] {
  const { year, todayStr, language, activityMap } = params;
  const start = { y: year, m: 1, d: 1 };
  const end = { y: year, m: 12, d: 31 };
  const daysToSubtract = weekdaySun0(start.y, start.m, start.d);
  let cursor = addDays(start.y, start.m, start.d, -daysToSubtract);

  const weeks: HeatmapDayCell[][] = [];
  let weekCount = 0;
  const endYmd = formatYmd(end.y, end.m, end.d);
  while (weekCount < 60) {
    if (formatYmd(cursor.y, cursor.m, cursor.d) > endYmd) break;
    const week: HeatmapDayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = formatYmd(cursor.y, cursor.m, cursor.d);
      const entry = activityMap.get(dateStr);
      const minutes = entry ? entry.minutes : 0;
      week.push({
        date: dateStr,
        minutes,
        level: durationToLevel(minutes),
        path: entry?.path ?? null,
        fullDate: fullDateForLanguage(cursor.y, cursor.m, cursor.d, language),
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
  return weeks;
}

export function appendHeatmapWeeks(
  parent: HTMLElement,
  weeks: HeatmapDayCell[][],
  colors: readonly string[],
  tooltip: string,
  tooltipOpen: string,
): void {
  const doc = parent.ownerDocument;
  const fragment = doc.createDocumentFragment();
  for (const week of weeks) {
    const isTodayWeek = week.some((day) => day.isToday && day.isCurrentYear);
    const weekEl = doc.createElement("div");
    weekEl.className = isTodayWeek ? "fitness-week is-today-week" : "fitness-week";
    for (const day of week) {
      const cell = doc.createElement("div");
      cell.className = cellClass(day);
      cell.dataset.testid = day.isToday
        ? "atomic-heatmap-today"
        : "atomic-heatmap-cell";
      cell.dataset.minutes = String(day.minutes);
      cell.dataset.date = day.fullDate;
      if (day.path) cell.dataset.path = day.path;
      cell.style.backgroundColor = day.isCurrentYear
        ? colorForLevel(colors, day.level)
        : EMPTY_CELL;
      cell.title = formatHeatmapTooltip(
        day.path ? tooltipOpen : tooltip,
        day.fullDate,
        day.minutes,
      );
      weekEl.appendChild(cell);
    }
    fragment.appendChild(weekEl);
  }
  const pad = doc.createElement("div");
  pad.className = "fitness-weeks-end-pad";
  fragment.appendChild(pad);
  parent.appendChild(fragment);
}

export function heatmapWeeksHtml(
  weeks: HeatmapDayCell[][],
  colors: readonly string[],
  tooltip: string,
  tooltipOpen: string,
): string {
  const parts: string[] = [];
  for (const week of weeks) {
    const isTodayWeek = week.some((day) => day.isToday && day.isCurrentYear);
    parts.push(
      `<div class="fitness-week${isTodayWeek ? " is-today-week" : ""}">`,
    );
    for (const day of week) {
      const color = day.isCurrentYear ? colorForLevel(colors, day.level) : EMPTY_CELL;
      const cls = cellClass(day);
      const testid = day.isToday ? "atomic-heatmap-today" : "atomic-heatmap-cell";
      const tip = formatHeatmapTooltip(
        day.path ? tooltipOpen : tooltip,
        day.fullDate,
        day.minutes,
      );
      const pathAttr = day.path
        ? ` data-path="${escapeHtmlAttr(day.path)}"`
        : "";
      parts.push(
        `<div class="${cls}" data-testid="${testid}" data-minutes="${day.minutes}" data-date="${escapeHtmlAttr(day.fullDate)}"${pathAttr} style="background-color:${escapeHtmlAttr(color)}" title="${escapeHtmlAttr(tip)}"></div>`,
      );
    }
    parts.push("</div>");
  }
  parts.push('<div class="fitness-weeks-end-pad"></div>');
  return parts.join("");
}

function colorForLevel(colors: readonly string[], level: number): string {
  if (!level) return EMPTY_CELL;
  return colors[level - 1] || colors[colors.length - 1] || EMPTY_CELL;
}

function cellClass(day: HeatmapDayCell): string {
  let cls = "fitness-cell";
  if (day.isToday) cls += " is-today";
  if (!day.isCurrentYear) cls += " is-faded";
  if (day.path) cls += " is-link";
  return cls;
}
