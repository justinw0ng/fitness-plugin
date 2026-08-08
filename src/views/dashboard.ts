import type { VaultDataSource } from "../data/vault-source";
import { parseSetTable, rowVolumeKg } from "../core";
import { nowYear } from "../dates";
import { GREEN, ORANGE, type SeriesConfig } from "../types";

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
  seriesList: SeriesConfig[],
  year: number,
  cuesPath: string,
): Promise<void> {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });

  const gymSeries = seriesList.find((s) => s.kind === "gym") || seriesList[0];
  const golfSeries =
    seriesList.find((s) => s.kind === "golf") || seriesList[1];

  const gymPages = gymSeries
    ? data.listSessions(gymSeries.folder, year)
    : [];
  const golfPages = golfSeries
    ? data.listSessions(golfSeries.folder, year)
    : [];

  let totalDuration = 0;
  let totalVolumeKg = 0;
  const muscleVolume = new Map<string, number>();
  const muscleFreq = new Map<string, number>();
  const gymSessionsByMonth = Array(12).fill(0) as number[];
  const gymVolumeByMonth = Array(12).fill(0) as number[];
  const golfSessionsByMonth = Array(12).fill(0) as number[];
  const feltCounts = { good: 0, ok: 0, bad: 0 };
  const focusCounts = new Map<string, number>();
  const recent: { date: string; label: string; path: string }[] = [];

  for (const p of gymPages) {
    const mi = monthIndexFromDate(p.date);
    if (mi >= 0) gymSessionsByMonth[mi] += 1;
    totalDuration += p.duration_min;
    if (p.date) {
      recent.push({
        date: p.date,
        label: gymSeries?.label || "Gym",
        path: p.path,
      });
    }
    const md = await data.readBody(p.path);
    let sessionVol = 0;
    for (const row of parseSetTable(md)) {
      const vol = rowVolumeKg(row, p.weight_unit);
      totalVolumeKg += vol;
      sessionVol += vol;
      if (row.muscle) {
        muscleFreq.set(row.muscle, (muscleFreq.get(row.muscle) || 0) + 1);
      }
      if (vol > 0) {
        const m = row.muscle || "Unknown";
        muscleVolume.set(m, (muscleVolume.get(m) || 0) + vol);
      }
    }
    if (mi >= 0) gymVolumeByMonth[mi] += sessionVol;
  }

  for (const p of golfPages) {
    const mi = monthIndexFromDate(p.date);
    if (mi >= 0) golfSessionsByMonth[mi] += 1;
    if (p.date) {
      recent.push({
        date: p.date,
        label: golfSeries?.label || "Golf",
        path: p.path,
      });
    }
    const felt = String(p.felt || "").toLowerCase();
    if (felt === "good" || felt === "ok" || felt === "bad") {
      feltCounts[felt] += 1;
    }
    for (const focus of p.focus) {
      focusCounts.set(focus, (focusCounts.get(focus) || 0) + 1);
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

  const cuesP = root.createEl("p");
  const cuesA = cuesP.createEl("a", {
    cls: "fitness-link",
    text: "💡 Golf cue rollup / 高爾夫提醒彙整",
  });
  cuesA.addEventListener("click", (e) => {
    e.preventDefault();
    void data.openPath(cuesPath);
  });

  const ul = root.createEl("ul");
  ul.createEl("li").innerHTML = `Gym sessions / 健身次數: <strong>${gymPages.length}</strong>`;
  ul.createEl("li").innerHTML = `Golf sessions / 高爾夫次數: <strong>${golfPages.length}</strong>`;
  ul.createEl("li").innerHTML = `Total gym duration / 健身總時長: <strong>${totalDuration}</strong> min / 分鐘`;
  ul.createEl("li").innerHTML = `Total gym volume / 健身總訓練量: <strong>${fmtKg(totalVolumeKg)}</strong> kg`;
  ul.createEl("li").setText(
    `Golf felt / 高爾夫感覺 — good / 好: ${feltCounts.good}, ok / 一般: ${feltCounts.ok}, bad / 差: ${feltCounts.bad}`,
  );

  root.createEl("h3", { text: "Monthly / 每月" });
  const sparks = root.createDiv({ cls: "fitness-monthly-sparks" });
  const g1 = sparks.createDiv();
  g1.appendText("Gym sessions / 健身 ");
  sparkline(g1, gymSessionsByMonth, GREEN[2]);
  const g2 = sparks.createDiv();
  g2.appendText("Gym volume / 訓練量 ");
  sparkline(g2, gymVolumeByMonth, GREEN[1]);
  const g3 = sparks.createDiv();
  g3.appendText("Golf sessions / 高爾夫 ");
  sparkline(g3, golfSessionsByMonth, ORANGE[2]);

  const monthTable = root.createEl("table");
  const thead = monthTable.createEl("thead");
  const hr = thead.createEl("tr");
  for (const h of [
    "Month / 月",
    "Gym / 健身",
    "Volume / 訓練量 (kg)",
    "Golf / 高爾夫",
  ]) {
    hr.createEl("th", { text: h });
  }
  const tbody = monthTable.createEl("tbody");
  for (let i = 0; i < 12; i++) {
    const tr = tbody.createEl("tr");
    tr.createEl("td", { text: monthNames[i] });
    tr.createEl("td", { text: String(gymSessionsByMonth[i]) });
    tr.createEl("td", { text: fmtKg(gymVolumeByMonth[i]) });
    tr.createEl("td", { text: String(golfSessionsByMonth[i]) });
  }

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
