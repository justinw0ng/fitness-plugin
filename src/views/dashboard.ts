import type { VaultDataSource } from "../data/vault-source";
import { parseSetTable, rowVolumeKg } from "../core";
import { nowYear } from "../dates";
import type { ActivityType, SessionMeta } from "../types";
import { cuePathForActivity, exerciseActivities } from "../util/activity-types";

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
): void {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const max = Math.max(1, ...values);
  const span = parent.createSpan({ cls: "fitness-sparkline" });
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const h = Math.max(2, Math.round((v / max) * 14));
    const bar = span.createSpan({ cls: "fitness-spark-bar" });
    bar.style.height = `${h}px`;
    bar.style.background = color;
    bar.setAttr("title", `${months[i]}: ${v}`);
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
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  root.createEl("h2", { text: `📊 ${year} overview / 總覽` });

  const cueActivities = activities.filter((activity) => activity.supportsCues);
  if (cueActivities.length) {
    const cuesP = root.createEl("p");
    cueActivities.forEach((activity, index) => {
      if (index > 0) cuesP.appendText(" · ");
      const cuesA = cuesP.createEl("a", {
        cls: "fitness-link",
        text: `💡 ${activity.label} cues / 提醒彙整`,
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
    li.appendText(`${stat.activity.label} sessions / 次數: `);
    li.createEl("strong", { text: String(stat.pages.length) });
    li.appendText(`, ${stat.duration} min / 分鐘`);
  }
  const durLi = ul.createEl("li");
  durLi.appendText("Total exercise duration / 運動總時長: ");
  durLi.createEl("strong", { text: String(totalDuration) });
  durLi.appendText(" min / 分鐘");
  if (activityStats.some((stat) => stat.activity.supportsSetTable)) {
    const volLi = ul.createEl("li");
    volLi.appendText("Total set-table volume / 總訓練量: ");
    volLi.createEl("strong", { text: fmtKg(totalVolumeKg) });
    volLi.appendText(" kg");
  }
  if (activities.some((activity) => activity.id === "golf")) {
    ul.createEl("li").setText(
      `Golf felt / 高爾夫感覺 — good / 好: ${feltCounts.good}, ok / 一般: ${feltCounts.ok}, bad / 差: ${feltCounts.bad}`,
    );
  }

  root.createEl("h3", { text: "Monthly / 每月" });
  const sparks = root.createDiv({ cls: "fitness-monthly-sparks" });
  for (const stat of activityStats) {
    const sessions = sparks.createDiv();
    sessions.appendText(`${stat.activity.label} sessions / 次數 `);
    sparkline(sessions, stat.sessionsByMonth, stat.activity.colors[2]);
    if (stat.activity.supportsSetTable) {
      const volume = sparks.createDiv();
      volume.appendText(`${stat.activity.label} volume / 訓練量 `);
      sparkline(volume, stat.volumeByMonth, stat.activity.colors[1]);
    }
  }

  const monthTable = root.createEl("table");
  const thead = monthTable.createEl("thead");
  const hr = thead.createEl("tr");
  hr.createEl("th", { text: "Month / 月" });
  for (const stat of activityStats) {
    hr.createEl("th", { text: stat.activity.label });
    if (stat.activity.supportsSetTable) {
      hr.createEl("th", { text: `${stat.activity.label} volume / 訓練量 (kg)` });
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
    root.createEl("h3", { text: "Muscles / 肌群" });
    const mTable = root.createEl("table");
    const mHead = mTable.createEl("thead").createEl("tr");
    for (const h of ["Muscle / 肌群", "Sets / 組數", "Volume / 訓練量 (kg)"]) {
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
        text: "No set data / 尚無組數資料",
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
    root.createEl("h3", { text: "Golf focus / 高爾夫重點" });
    const focusUl = root.createEl("ul");
    const focuses = sortMapDesc(focusCounts);
    if (!focuses.length) {
      focusUl.createEl("li", {
        text: "No focus tags / 尚無重點標籤",
        cls: "fitness-muted",
      });
    } else {
      for (const [name, count] of focuses) {
        focusUl.createEl("li", { text: `${name}: ${count}` });
      }
    }
  }

  root.createEl("h3", { text: "Recent sessions / 最近訓練" });
  const recentUl = root.createEl("ul");
  if (!recent10.length) {
    recentUl.createEl("li", {
      text: "No sessions yet / 尚未記錄",
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
