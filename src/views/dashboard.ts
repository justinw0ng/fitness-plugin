import type { VaultDataSource } from "../data/vault-source";
import { parseSetTable, rowVolumeKg } from "../core";
import { parseTimeLog } from "../core/hobby";
import { monthShortForLanguage, nowYear } from "../dates";
import { BOOK_SHELF_HOST_REL } from "../hobbies/book-shelf-host";
import { READING_BOOKSHELF_REL } from "../hobbies/reading-bookshelf";
import { t, type Language } from "../i18n";
import type { ActivityType, SessionMeta } from "../types";
import {
  cuePathForActivity,
  exerciseActivities,
  hobbyActivities,
} from "../util/activity-types";

function monthIndexFromDate(dateStr: string | null): number {
  const m = String(dateStr || "").match(/^\d{4}-(\d{2})-/);
  return m ? Number(m[1]) - 1 : -1;
}

function fmtKg(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}

function sortMapDesc(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

function collectGolfStats(
  page: SessionMeta,
  feltCounts: { good: number; ok: number; bad: number },
  focusCounts: Map<string, number>,
): void {
  const felt = String(page.felt || "").toLowerCase();
  if (felt === "good" || felt === "ok" || felt === "bad") {
    feltCounts[felt] += 1;
  }
  for (const focus of page.focus) {
    focusCounts.set(focus, (focusCounts.get(focus) || 0) + 1);
  }
}

function sparkline(
  parent: HTMLElement,
  values: number[],
  color: string,
  language: Language,
): void {
  const max = Math.max(1, ...values);
  const span = parent.createSpan({ cls: "fitness-sparkline" });
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const h = Math.max(2, Math.round((v / max) * 14));
    const bar = span.createSpan({ cls: "fitness-spark-bar" });
    bar.style.height = `${h}px`;
    bar.style.background = color;
    bar.setAttr("title", `${monthShortForLanguage(2000, i + 1, 1, language)}: ${v}`);
  }
}

export function resolveDashboardYear(
  opts: Record<string, string>,
  frontmatterYear: unknown,
  timezone: string,
): number {
  if (opts.year && Number(opts.year)) return Number(opts.year);
  const n = Number(frontmatterYear);
  if (Number.isFinite(n) && n >= 1970) return n;
  return nowYear(timezone);
}

export async function renderDashboard(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  language: Language,
): Promise<void> {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });

  const activities = exerciseActivities(activityTypes);
  let totalDuration = 0;
  let totalVolumeKg = 0;
  const muscleVolume = new Map<string, number>();
  const muscleFreq = new Map<string, number>();
  const activityStats = activities.map((activity) => ({
    activity,
    pages: data.listSessions(activity.folder, year),
    sessionsByMonth: Array(12).fill(0) as number[],
    duration: 0,
    volumeByMonth: Array(12).fill(0) as number[],
    volumeKg: 0,
  }));
  const feltCounts = { good: 0, ok: 0, bad: 0 };
  const focusCounts = new Map<string, number>();
  const recent: { date: string; label: string; path: string }[] = [];

  for (const stat of activityStats) {
    for (const page of stat.pages) {
      const mi = monthIndexFromDate(page.date);
      if (mi >= 0) stat.sessionsByMonth[mi] += 1;
      stat.duration += page.duration_min;
      totalDuration += page.duration_min;
      if (page.date) {
        recent.push({
          date: page.date,
          label: stat.activity.label,
          path: page.path,
        });
      }

      if (stat.activity.supportsSetTable) {
        const md = await data.readBody(page.path);
        let sessionVol = 0;
        for (const row of parseSetTable(md)) {
          const vol = rowVolumeKg(row, page.weight_unit);
          totalVolumeKg += vol;
          stat.volumeKg += vol;
          sessionVol += vol;
          if (row.muscle) {
            muscleFreq.set(row.muscle, (muscleFreq.get(row.muscle) || 0) + 1);
          }
          if (vol > 0) {
            const m = row.muscle || "Unknown";
            muscleVolume.set(m, (muscleVolume.get(m) || 0) + vol);
          }
        }
        if (mi >= 0) stat.volumeByMonth[mi] += sessionVol;
      }

      if (stat.activity.id === "golf") {
        collectGolfStats(page, feltCounts, focusCounts);
      }
    }
  }

  recent.sort((a, b) => b.date.localeCompare(a.date));
  const recent10 = recent.slice(0, 10);
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    monthShortForLanguage(year, index + 1, 1, language),
  );

  root.createEl("h2", {
    text: t("view.dashboard.overview", language, { year }),
  });

  const cueActivities = activities.filter((activity) => activity.supportsCues);
  if (cueActivities.length) {
    const cuesP = root.createEl("p");
    cueActivities.forEach((activity, index) => {
      if (index > 0) cuesP.appendText(" · ");
      const cuesA = cuesP.createEl("a", {
        cls: "fitness-link",
        text: t("view.dashboard.cues", language, { activity: activity.label }),
      });
      cuesA.addEventListener("click", (e) => {
        e.preventDefault();
        void data.openPath(cuePathForActivity(activity));
      });
    });
  }

  const ul = root.createEl("ul");
  for (const stat of activityStats) {
    const li = ul.createEl("li");
    li.appendText(t("view.dashboard.sessions", language, { activity: stat.activity.label }));
    li.createEl("strong", { text: String(stat.pages.length) });
    li.appendText(t("view.dashboard.durationSuffix", language, { minutes: stat.duration }));
  }
  const durLi = ul.createEl("li");
  durLi.appendText(t("view.dashboard.totalExerciseDuration", language));
  durLi.createEl("strong", { text: String(totalDuration) });
  durLi.appendText(t("view.dashboard.minuteUnit", language));
  if (activityStats.some((stat) => stat.activity.supportsSetTable)) {
    const volLi = ul.createEl("li");
    volLi.appendText(t("view.dashboard.totalVolume", language));
    volLi.createEl("strong", { text: fmtKg(totalVolumeKg) });
    volLi.appendText(" kg");
  }
  if (activities.some((activity) => activity.id === "golf")) {
    ul.createEl("li").setText(
      t("view.dashboard.golfFelt", language, feltCounts),
    );
  }

  const hobbyStats: Array<{
    activity: ActivityType;
    itemCount: number;
    minutes: number;
  }> = [];
  for (const activity of hobbyActivities(activityTypes)) {
    const items = data.listHobbyItems(activity);
    let minutes = 0;
    for (const item of items) {
      const markdown = await data.readBody(item.path);
      for (const entry of parseTimeLog(markdown)) {
        if (entry.date.startsWith(`${year}-`)) {
          minutes += entry.minutes;
        }
      }
    }
    hobbyStats.push({ activity, itemCount: items.length, minutes });
  }

  if (hobbyStats.length) {
    root.createEl("h3", { text: t("view.dashboard.hobbies", language) });
    const hobbyUl = root.createEl("ul");
    for (const stat of hobbyStats) {
      const li = hobbyUl.createEl("li");
      li.appendText(t("view.dashboard.items", language, { activity: stat.activity.label }));
      li.createEl("strong", { text: String(stat.itemCount) });
      li.appendText(t("view.dashboard.hobbyMinutesSuffix", language, { minutes: stat.minutes }));
    }
    if (hobbyStats.some((stat) => stat.activity.id === "reading")) {
      const links = root.createEl("p");
      const baseLink = links.createEl("a", {
        cls: "fitness-link",
        text: t("view.dashboard.readingBookshelf", language),
      });
      baseLink.addEventListener("click", (event) => {
        event.preventDefault();
        void data.openPath(READING_BOOKSHELF_REL);
      });
      links.appendText(" · ");
      const shelfLink = links.createEl("a", {
        cls: "fitness-link",
        text: t("view.dashboard.bookShelf", language),
      });
      shelfLink.addEventListener("click", (event) => {
        event.preventDefault();
        void data.openPath(BOOK_SHELF_HOST_REL);
      });
    }
  }

  root.createEl("h3", { text: t("view.dashboard.monthly", language) });
  const sparks = root.createDiv({ cls: "fitness-monthly-sparks" });
  for (const stat of activityStats) {
    const sessions = sparks.createDiv();
    sessions.appendText(t("view.dashboard.sparkSessions", language, { activity: stat.activity.label }));
    sparkline(sessions, stat.sessionsByMonth, stat.activity.colors[2], language);
    if (stat.activity.supportsSetTable) {
      const volume = sparks.createDiv();
      volume.appendText(t("view.dashboard.sparkVolume", language, { activity: stat.activity.label }));
      sparkline(volume, stat.volumeByMonth, stat.activity.colors[1], language);
    }
  }

  const monthTable = root.createEl("table");
  const thead = monthTable.createEl("thead");
  const hr = thead.createEl("tr");
  hr.createEl("th", { text: t("view.dashboard.month", language) });
  for (const stat of activityStats) {
    hr.createEl("th", { text: stat.activity.label });
    if (stat.activity.supportsSetTable) {
      hr.createEl("th", {
        text: t("view.dashboard.volumeHeader", language, { activity: stat.activity.label }),
      });
    }
  }
  const tbody = monthTable.createEl("tbody");
  for (let i = 0; i < 12; i++) {
    const tr = tbody.createEl("tr");
    tr.createEl("td", { text: monthNames[i] });
    for (const stat of activityStats) {
      tr.createEl("td", { text: String(stat.sessionsByMonth[i]) });
      if (stat.activity.supportsSetTable) {
        tr.createEl("td", { text: fmtKg(stat.volumeByMonth[i]) });
      }
    }
  }

  if (activityStats.some((stat) => stat.activity.supportsSetTable)) {
    root.createEl("h3", { text: t("view.dashboard.muscles", language) });
    const mTable = root.createEl("table");
    const mHead = mTable.createEl("thead").createEl("tr");
    for (const h of [
      t("view.dashboard.muscle", language),
      t("view.dashboard.sets", language),
      t("view.dashboard.volumeKg", language),
    ]) {
      mHead.createEl("th", { text: h });
    }
    const mBody = mTable.createEl("tbody");
    const muscles = new Set([...muscleFreq.keys(), ...muscleVolume.keys()]);
    const muscleRows = [...muscles].map((m) => ({
      m,
      freq: muscleFreq.get(m) || 0,
      vol: muscleVolume.get(m) || 0,
    }));
    muscleRows.sort(
      (a, b) => b.vol - a.vol || b.freq - a.freq || a.m.localeCompare(b.m),
    );
    if (!muscleRows.length) {
      const tr = mBody.createEl("tr");
      tr.createEl("td", {
        text: t("view.dashboard.noSetData", language),
        attr: { colspan: "3" },
      }).addClass("fitness-muted");
    } else {
      for (const r of muscleRows) {
        const tr = mBody.createEl("tr");
        tr.createEl("td", { text: r.m });
        tr.createEl("td", { text: String(r.freq) });
        tr.createEl("td", { text: fmtKg(r.vol) });
      }
    }
  }

  if (activities.some((activity) => activity.id === "golf")) {
    root.createEl("h3", { text: t("view.dashboard.golfFocus", language) });
    const focusUl = root.createEl("ul");
    const focuses = sortMapDesc(focusCounts);
    if (!focuses.length) {
      focusUl.createEl("li", {
        text: t("view.dashboard.noFocusTags", language),
        cls: "fitness-muted",
      });
    } else {
      for (const [name, count] of focuses) {
        focusUl.createEl("li", { text: `${name}: ${count}` });
      }
    }
  }

  root.createEl("h3", { text: t("view.dashboard.recentSessions", language) });
  const recentUl = root.createEl("ul");
  if (!recent10.length) {
    recentUl.createEl("li", {
      text: t("view.dashboard.noSessions", language),
      cls: "fitness-muted",
    });
  } else {
    for (const r of recent10) {
      const li = recentUl.createEl("li");
      li.appendText(`${r.date} · ${r.label}: `);
      const a = li.createEl("a", { cls: "fitness-link", text: r.path });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        void data.openPath(r.path);
      });
    }
  }
}
