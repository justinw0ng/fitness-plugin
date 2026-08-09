import type { VaultDataSource } from "../data/vault-source";
import { durationToLevel } from "../core";
import { minutesByDateForYear } from "../core/hobby";
import {
  addDays,
  formatYmd,
  fullDateForLanguage,
  monthShortForLanguage,
  parseYmd,
  weekdaySun0,
  ymdInZone,
} from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import { EMPTY_CELL, type ActivityType, type DayActivity } from "../types";
import { exerciseActivities, hobbyActivities } from "../util/activity-types";

const DAY_NAMES: Record<Language, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "zh-Hant-en": ["日", "一", "二", "三", "四", "五", "六"],
};

function colorFor(activity: ActivityType, level: number): string {
  if (!level) return EMPTY_CELL;
  return activity.colors[level - 1] || activity.colors[activity.colors.length - 1];
}

async function durationMap(
  data: VaultDataSource,
  activity: ActivityType,
  year: number,
): Promise<Map<string, DayActivity>> {
  const map = new Map<string, DayActivity>();
  if (activity.domain === "hobby") {
    const items = data.listHobbyItems(activity);
    const perItem = await Promise.all(
      items.map(async (item) => ({
        path: item.path,
        totals: minutesByDateForYear(
          await data.getHobbyTimeLogEntries(item.path),
          year,
        ),
      })),
    );
    for (const { path, totals } of perItem) {
      for (const [date, minutes] of totals) {
        const entry = map.get(date) || { minutes: 0, path };
        entry.minutes += minutes;
        if (!entry.path) entry.path = path;
        map.set(date, entry);
      }
    }
    return map;
  }

  for (const s of data.listSessions(activity.folder, year)) {
    if (!s.date) continue;
    const entry = map.get(s.date) || { minutes: 0, path: null };
    entry.minutes += s.duration_min;
    if (!entry.path) entry.path = s.path;
    map.set(s.date, entry);
  }
  return map;
}

async function renderOneHeatmap(
  root: HTMLElement,
  data: VaultDataSource,
  activity: ActivityType,
  year: number,
  timezone: string,
  language: Language,
): Promise<void> {
  const wrap = root.createDiv({ cls: "fitness-heatmap" });
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

  const activityMap = await durationMap(data, activity, year);
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

  const monthRow = wrap.createDiv({ cls: "fitness-month-row" });
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

  const gridWrap = wrap.createDiv({ cls: "fitness-grid-wrap" });
  const dayLabels = gridWrap.createDiv({ cls: "fitness-day-labels" });
  for (const d of DAY_NAMES[language]) {
    dayLabels.createDiv({ cls: "fitness-day-label", text: d });
  }

  const weeksEl = gridWrap.createDiv({ cls: "fitness-weeks" });
  for (const week of weeks) {
    const col = weeksEl.createDiv({ cls: "fitness-week" });
    for (const day of week) {
      const color = day.isCurrentYear
        ? colorFor(activity, day.level)
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
        ? t("view.heatmap.tooltipOpen", language, {
            date: day.fullDate,
            minutes: day.minutes,
          })
        : t("view.heatmap.tooltip", language, {
            date: day.fullDate,
            minutes: day.minutes,
          });
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

export async function renderHeatmaps(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  timezone: string,
  language: Language,
): Promise<void> {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  for (const activity of [
    ...exerciseActivities(activityTypes),
    ...hobbyActivities(activityTypes),
  ]) {
    await renderOneHeatmap(root, data, activity, year, timezone, language);
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
