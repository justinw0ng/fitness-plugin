"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FitnessPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/commands/create-session.ts
var import_obsidian = require("obsidian");

// src/core.ts
var LB_TO_KG = 0.45359237;
var MUSCLES = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core"
];
var GYM_LOCATIONS = ["Home", "Commercial", "Hotel/Travel", "Other"];
function isLoadedWeight(weight) {
  if (weight === null || weight === void 0)
    return false;
  const s = String(weight).trim();
  if (!s)
    return false;
  const lower = s.toLowerCase();
  if (lower === "bw" || s === "\u2014" || s === "-" || lower === "n/a")
    return false;
  return !Number.isNaN(Number(s));
}
function toKg(weight, unit) {
  const n = Number(weight);
  if (Number.isNaN(n))
    return 0;
  return unit === "lb" ? n * LB_TO_KG : n;
}
function rowVolumeKg(row, unit = "kg") {
  if (!isLoadedWeight(row.weight))
    return 0;
  const reps = Number(row.reps);
  if (!Number.isFinite(reps) || reps <= 0)
    return 0;
  return toKg(row.weight, unit) * reps;
}
function parseSetTable(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const rows = [];
  let inTable = false;
  let headerSeen = false;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      if (inTable && headerSeen)
        break;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (!cells.length)
      continue;
    const joined = cells.join(" ").toLowerCase();
    if (!headerSeen) {
      if (joined.includes("exercise") && joined.includes("muscle")) {
        headerSeen = true;
        inTable = true;
      }
      continue;
    }
    if (cells.every((c) => /^:?-{1,}:?$/.test(c)))
      continue;
    rows.push({
      exercise: cells[0] || "",
      muscle: cells[1] || "",
      weight: cells[2] || "",
      reps: cells[3] || "",
      notes: cells[4] || ""
    });
  }
  return rows;
}
function durationToLevel(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0)
    return 0;
  if (n < 30)
    return 1;
  if (n < 60)
    return 2;
  if (n < 90)
    return 3;
  return 4;
}
function normalizeCue(text) {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function cuesInCalendarMonth(cues, year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return cues.filter((c) => String(c.date || "").startsWith(prefix)).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function buildKeepers(cues, year) {
  const prefix = `${year}-`;
  const map = /* @__PURE__ */ new Map();
  const yearCues = cues.filter((c) => String(c.date || "").startsWith(prefix)).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (const c of yearCues) {
    const key = normalizeCue(c.text);
    if (!key)
      continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        key,
        text: c.text,
        focus: c.focus || "",
        count: 1,
        lastSeen: c.date
      });
    } else {
      prev.count += 1;
      prev.text = c.text;
      prev.focus = c.focus || prev.focus;
      prev.lastSeen = c.date;
    }
  }
  return [...map.values()].filter((k) => k.count >= 2).sort(
    (a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen)
  );
}
function parseReminders(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const out = [];
  let inRem = false;
  for (const line of lines) {
    if (/^##\s+(?:\S+\s+)?Reminders(?:\s*\/\s*.+)?\s*$/i.test(line.trim())) {
      inRem = true;
      continue;
    }
    if (inRem && /^##\s+/.test(line))
      break;
    if (inRem) {
      const m = line.match(/^\s*[-*]\s+(.+)$/);
      if (m)
        out.push(m[1].trim());
    }
  }
  return out;
}

// src/dates.ts
function ymdInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
function nowYear(timeZone) {
  return Number(ymdInZone(/* @__PURE__ */ new Date(), timeZone).slice(0, 4));
}
function nowMonth(timeZone) {
  return Number(ymdInZone(/* @__PURE__ */ new Date(), timeZone).slice(5, 7));
}
function parseYmd(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m)
    return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}
function weekdaySun0(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}
function addDays(y, m, d, delta) {
  const dt = new Date(Date.UTC(y, m - 1, d + delta, 12));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate()
  };
}
function formatYmd(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function monthShortZh(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    timeZone: "UTC"
  }).format(dt);
}
function fullDateZh(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("zh-HK", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(dt);
}
function monthLongEn(y, m) {
  const dt = new Date(Date.UTC(y, m - 1, 1, 12));
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(dt);
}
function monthLongZh(y, m) {
  const dt = new Date(Date.UTC(y, m - 1, 1, 12));
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(dt);
}
function extractYmdFromPath(path) {
  const m = String(path || "").match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// src/util/yaml.ts
function yamlScalar(value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

// src/commands/create-session.ts
function promptText(app, title, defaultValue) {
  return new Promise((resolve) => {
    const modal = new class extends import_obsidian.Modal {
      constructor() {
        super(...arguments);
        this.value = defaultValue;
        this.resolved = false;
      }
      onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: title });
        new import_obsidian.Setting(contentEl).addText((text) => {
          text.setValue(defaultValue);
          text.inputEl.style.width = "100%";
          text.onChange((v) => {
            this.value = v;
          });
          text.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              this.finish(this.value);
            }
          });
          window.setTimeout(() => text.inputEl.focus(), 20);
        });
        new import_obsidian.Setting(contentEl).addButton(
          (btn) => btn.setButtonText("Cancel").onClick(() => this.finish(null))
        ).addButton(
          (btn) => btn.setButtonText("OK").setCta().onClick(() => this.finish(this.value))
        );
      }
      finish(v) {
        if (this.resolved)
          return;
        this.resolved = true;
        this.close();
        resolve(v);
      }
      onClose() {
        if (!this.resolved) {
          this.resolved = true;
          resolve(null);
        }
      }
    }(app);
    modal.open();
  });
}
function suggestOne(app, placeholder, items, labels) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new class extends import_obsidian.FuzzySuggestModal {
      getItems() {
        return items;
      }
      getItemText(item) {
        const i = items.indexOf(item);
        return labels && labels[i] ? labels[i] : item;
      }
      onChooseItem(item) {
        if (settled)
          return;
        settled = true;
        resolve(item);
      }
      onClose() {
        if (settled)
          return;
        settled = true;
        resolve(null);
      }
    }(app);
    modal.setPlaceholder(placeholder);
    modal.open();
  });
}
function gymBody(date, location, locationDetail, weightUnit) {
  const muscleHints = [
    "Chest / \u80F8",
    "Back / \u80CC",
    "Shoulders / \u80A9",
    "Biceps / \u4E8C\u982D",
    "Triceps / \u4E09\u982D",
    "Quads / \u80A1\u56DB\u982D",
    "Hamstrings / \u817F\u5F8C\u8171",
    "Glutes / \u81C0",
    "Calves / \u5C0F\u817F",
    "Core / \u6838\u5FC3"
  ];
  return `---
type: session
date: ${date}
activity: gym
duration_min:
location: ${yamlScalar(location)}
location_detail: ${yamlScalar(locationDetail)}
weight_unit: ${weightUnit}
---

# \u{1F3CB}\uFE0F Gym / \u5065\u8EAB \u2014 ${date}

<!-- \u{1F4AA} Muscles / \u808C\u7FA4: ${muscleHints.join(", ")} -->

| \u{1F4AA} Exercise / \u52D5\u4F5C | \u{1F9EC} Muscle / \u808C\u7FA4 | \u2696\uFE0F Weight / \u91CD\u91CF | \u{1F522} Reps / \u6B21\u6578 | \u{1F5D2}\uFE0F Notes / \u5099\u8A3B |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
`;
}
function golfBody(date) {
  return `---
type: session
date: ${date}
activity: golf
duration_min:
location:
focus: []
club: []
---

# \u26F3 Golf / \u9AD8\u723E\u592B \u2014 ${date}

<!-- \u{1F4CD} location / \u5730\u9EDE: Home net / \u5BB6\u7528\u7DB2, Driving range / \u7DF4\u7FD2\u5834, Course / \u7403\u5834, Other / \u5176\u4ED6 -->
<!-- \u{1F3AF} focus / \u91CD\u9EDE (multi): Grip / \u63E1\u687F, Stance / \u7AD9\u59FF, Takeaway / \u8D77\u687F, Backswing / \u4E0A\u687F, Transition / \u8F49\u63DB, Downswing / \u4E0B\u687F, Impact / \u64CA\u7403, Follow-through / \u9001\u687F, Tempo / \u7BC0\u594F, Alignment / \u7784\u6E96\u7DDA -->
<!-- \u{1F3CC}\uFE0F club / \u7403\u687F (multi): Driver / \u4E00\u865F\u6728, 3W / \u4E09\u865F\u6728, 5W / \u4E94\u865F\u6728, Hybrid / \u6DF7\u8840\u687F, 4i\u20139i / \u9435\u687F, PW / \u5288\u8D77\u687F, GW / \u7F3A\u53E3\u687F, SW / \u6C99\u5751\u687F, LW / \u9AD8\u540A\u687F, Putter / \u63A8\u687F, Mixed / \u6DF7\u5408 -->

## \u{1F4A1} Reminders / \u63D0\u9192

- 
`;
}
async function createGymSession(app, data, series, timezone) {
  const today = ymdInZone(/* @__PURE__ */ new Date(), timezone);
  const dateRaw = await promptText(app, "Date / \u65E5\u671F (YYYY-MM-DD)", today);
  if (dateRaw === null)
    return;
  let date = dateRaw.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    new import_obsidian.Notice("Invalid date / \u65E5\u671F\u7121\u6548");
    return;
  }
  const year = date.slice(0, 4);
  const folder = `${series.folder}/${year}`;
  const target = `${folder}/${date}.md`;
  if (data.exists(target)) {
    await data.openPath(target);
    new import_obsidian.Notice(`Opened existing gym session / \u5DF2\u958B\u555F: ${target}`);
    return;
  }
  const locationLabels = [
    "Home / \u5BB6\u4E2D",
    "Commercial / \u5546\u696D\u5065\u8EAB\u623F",
    "Hotel/Travel / \u9152\u5E97\uFF0F\u65C5\u9014",
    "Other / \u5176\u4ED6"
  ];
  let location = await suggestOne(
    app,
    "Location / \u5730\u9EDE (Esc to skip / \u7565\u904E)",
    GYM_LOCATIONS,
    locationLabels
  ) || "";
  let locationDetail = "";
  if (location === "Other") {
    locationDetail = await promptText(app, "Other location detail / \u5176\u4ED6\u5730\u9EDE\u8AAA\u660E", "") || "";
  }
  let weightUnit = await suggestOne(app, "Weight unit / \u91CD\u91CF\u55AE\u4F4D (Esc \u2192 kg)", [
    "kg",
    "lb"
  ]) || "kg";
  if (weightUnit !== "lb")
    weightUnit = "kg";
  await data.createNote(
    target,
    gymBody(date, location, locationDetail, weightUnit)
  );
  await data.openPath(target);
  new import_obsidian.Notice(`Created gym session / \u5DF2\u5EFA\u7ACB: ${target}`);
}
async function createGolfSession(app, data, series, timezone) {
  const today = ymdInZone(/* @__PURE__ */ new Date(), timezone);
  const dateRaw = await promptText(app, "Date / \u65E5\u671F (YYYY-MM-DD)", today);
  if (dateRaw === null)
    return;
  let date = dateRaw.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    new import_obsidian.Notice("Invalid date / \u65E5\u671F\u7121\u6548");
    return;
  }
  const year = date.slice(0, 4);
  const folder = `${series.folder}/${year}`;
  const target = `${folder}/${date}.md`;
  if (data.exists(target)) {
    await data.openPath(target);
    new import_obsidian.Notice(`Opened existing golf session / \u5DF2\u958B\u555F: ${target}`);
    return;
  }
  await data.createNote(target, golfBody(date));
  await data.openPath(target);
  new import_obsidian.Notice(`Created golf session / \u5DF2\u5EFA\u7ACB: ${target}`);
}

// src/util/parse-block.ts
function parseBlockOptions(source) {
  const out = {};
  for (const line of String(source || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+?)\s*$/);
    if (!m)
      continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// src/views/actions.ts
function renderActions(el, plugin) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const wrap = root.createDiv({ cls: "fitness-actions" });
  const gymBtn = wrap.createEl("button", { text: "\u{1F3CB}\uFE0F Gym / \u5065\u8EAB" });
  gymBtn.addEventListener("click", () => {
    void plugin.createGymSession();
  });
  const golfBtn = wrap.createEl("button", { text: "\u26F3 Golf / \u9AD8\u723E\u592B" });
  golfBtn.addEventListener("click", () => {
    void plugin.createGolfSession();
  });
}

// src/views/cues.ts
function resolveCuesYear(opts, frontmatterYear2, timezone) {
  if (opts.year && Number(opts.year))
    return Number(opts.year);
  const n = Number(frontmatterYear2);
  if (Number.isFinite(n) && n >= 1970)
    return n;
  return nowYear(timezone);
}
async function renderGolfCues(el, data, seriesList, year, timezone) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const golf = seriesList.find((s) => s.kind === "golf") || seriesList.find((s) => s.folder === "Golf");
  if (!golf) {
    root.createEl("p", {
      text: "No golf series configured.",
      cls: "fitness-muted"
    });
    return;
  }
  const currentYear = nowYear(timezone);
  const month = year === currentYear ? nowMonth(timezone) : 12;
  const monthLabel = year === currentYear ? `${monthLongEn(year, month)} / ${monthLongZh(year, month)}` : `December ${year} / ${year}\u5E7412\u6708`;
  const cues = [];
  for (const p of data.listSessions(golf.folder, year)) {
    if (!p.date)
      continue;
    const md = await data.readBody(p.path);
    const focus = p.focus.join(", ");
    for (const text of parseReminders(md)) {
      if (!text)
        continue;
      cues.push({ text, date: p.date, focus });
    }
  }
  const thisMonth = cuesInCalendarMonth(cues, year, month);
  const keepers = buildKeepers(cues, year);
  root.createEl("h2", {
    text: `\u{1F4C5} This month / \u672C\u6708 \u2014 ${monthLabel}`
  });
  if (!thisMonth.length) {
    root.createEl("p", {
      text: "No reminders this month / \u672C\u6708\u5C1A\u7121\u63D0\u9192",
      cls: "fitness-muted"
    });
  } else {
    const ul = root.createEl("ul");
    for (const c of thisMonth) {
      const focusBit = c.focus ? ` \xB7 ${c.focus}` : "";
      ul.createEl("li", { text: `${c.date}${focusBit}: ${c.text}` });
    }
  }
  root.createEl("h2", {
    text: `\u2B50 Keepers / \u5E38\u99D0\u63D0\u9192 (\u22652 in ${year})`
  });
  if (!keepers.length) {
    root.createEl("p", {
      text: "No keepers yet / \u5C1A\u7121\u5E38\u99D0\u63D0\u9192",
      cls: "fitness-muted"
    });
  } else {
    const ul = root.createEl("ul");
    for (const k of keepers) {
      const focusBit = k.focus ? ` \xB7 ${k.focus}` : "";
      const li = ul.createEl("li");
      li.createEl("strong", { text: k.text });
      li.appendText(
        ` (\xD7${k.count}, last / \u6700\u8FD1 ${k.lastSeen}${focusBit})`
      );
    }
  }
}

// src/types.ts
var GREEN = [
  "#9be9a8",
  "#40c463",
  "#30a14e",
  "#216e39"
];
var ORANGE = [
  "#ffd8a8",
  "#ffa94d",
  "#f76707",
  "#d9480f"
];
var EMPTY_CELL = "#ebedf0";
var DEFAULT_SETTINGS = {
  timezone: "Asia/Hong_Kong",
  dashboardPath: "Fitness/Dashboard.md",
  cuesPath: "Golf/Cues.md",
  series: [
    {
      id: "gym",
      label: "\u{1F3CB}\uFE0F Gym / \u5065\u8EAB",
      folder: "Gym",
      colors: GREEN,
      kind: "gym"
    },
    {
      id: "golf",
      label: "\u26F3 Golf / \u9AD8\u723E\u592B",
      folder: "Golf",
      colors: ORANGE,
      kind: "golf"
    }
  ]
};

// src/views/dashboard.ts
function monthIndexFromDate(dateStr) {
  const m = String(dateStr || "").match(/^\d{4}-(\d{2})-/);
  return m ? Number(m[1]) - 1 : -1;
}
function fmtKg(n) {
  return (Math.round(n * 10) / 10).toLocaleString();
}
function sortMapDesc(map) {
  return [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
}
function sparkline(parent, values, color) {
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
    "Dec"
  ];
  const max = Math.max(1, ...values);
  const span = parent.createSpan({ cls: "fitness-sparkline" });
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const h = Math.max(2, Math.round(v / max * 14));
    const bar = span.createSpan({ cls: "fitness-spark-bar" });
    bar.style.height = `${h}px`;
    bar.style.background = color;
    bar.setAttr("title", `${months[i]}: ${v}`);
  }
}
function resolveDashboardYear(opts, frontmatterYear2, timezone) {
  if (opts.year && Number(opts.year))
    return Number(opts.year);
  const n = Number(frontmatterYear2);
  if (Number.isFinite(n) && n >= 1970)
    return n;
  return nowYear(timezone);
}
async function renderDashboard(el, data, seriesList, year, cuesPath) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const gymSeries = seriesList.find((s) => s.kind === "gym") || seriesList[0];
  const golfSeries = seriesList.find((s) => s.kind === "golf") || seriesList[1];
  const gymPages = gymSeries ? data.listSessions(gymSeries.folder, year) : [];
  const golfPages = golfSeries ? data.listSessions(golfSeries.folder, year) : [];
  let totalDuration = 0;
  let totalVolumeKg = 0;
  const muscleVolume = /* @__PURE__ */ new Map();
  const muscleFreq = /* @__PURE__ */ new Map();
  const gymSessionsByMonth = Array(12).fill(0);
  const gymVolumeByMonth = Array(12).fill(0);
  const golfSessionsByMonth = Array(12).fill(0);
  const feltCounts = { good: 0, ok: 0, bad: 0 };
  const focusCounts = /* @__PURE__ */ new Map();
  const recent = [];
  for (const p of gymPages) {
    const mi = monthIndexFromDate(p.date);
    if (mi >= 0)
      gymSessionsByMonth[mi] += 1;
    totalDuration += p.duration_min;
    if (p.date) {
      recent.push({
        date: p.date,
        label: gymSeries?.label || "Gym",
        path: p.path
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
    if (mi >= 0)
      gymVolumeByMonth[mi] += sessionVol;
  }
  for (const p of golfPages) {
    const mi = monthIndexFromDate(p.date);
    if (mi >= 0)
      golfSessionsByMonth[mi] += 1;
    if (p.date) {
      recent.push({
        date: p.date,
        label: golfSeries?.label || "Golf",
        path: p.path
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
    "Dec"
  ];
  root.createEl("h2", { text: `\u{1F4CA} ${year} overview / \u7E3D\u89BD` });
  const cuesP = root.createEl("p");
  const cuesA = cuesP.createEl("a", {
    cls: "fitness-link",
    text: "\u{1F4A1} Golf cue rollup / \u9AD8\u723E\u592B\u63D0\u9192\u5F59\u6574"
  });
  cuesA.addEventListener("click", (e) => {
    e.preventDefault();
    void data.openPath(cuesPath);
  });
  const ul = root.createEl("ul");
  const gymLi = ul.createEl("li");
  gymLi.appendText("Gym sessions / \u5065\u8EAB\u6B21\u6578: ");
  gymLi.createEl("strong", { text: String(gymPages.length) });
  const golfLi = ul.createEl("li");
  golfLi.appendText("Golf sessions / \u9AD8\u723E\u592B\u6B21\u6578: ");
  golfLi.createEl("strong", { text: String(golfPages.length) });
  const durLi = ul.createEl("li");
  durLi.appendText("Total gym duration / \u5065\u8EAB\u7E3D\u6642\u9577: ");
  durLi.createEl("strong", { text: String(totalDuration) });
  durLi.appendText(" min / \u5206\u9418");
  const volLi = ul.createEl("li");
  volLi.appendText("Total gym volume / \u5065\u8EAB\u7E3D\u8A13\u7DF4\u91CF: ");
  volLi.createEl("strong", { text: fmtKg(totalVolumeKg) });
  volLi.appendText(" kg");
  ul.createEl("li").setText(
    `Golf felt / \u9AD8\u723E\u592B\u611F\u89BA \u2014 good / \u597D: ${feltCounts.good}, ok / \u4E00\u822C: ${feltCounts.ok}, bad / \u5DEE: ${feltCounts.bad}`
  );
  root.createEl("h3", { text: "Monthly / \u6BCF\u6708" });
  const sparks = root.createDiv({ cls: "fitness-monthly-sparks" });
  const g1 = sparks.createDiv();
  g1.appendText("Gym sessions / \u5065\u8EAB ");
  sparkline(g1, gymSessionsByMonth, GREEN[2]);
  const g2 = sparks.createDiv();
  g2.appendText("Gym volume / \u8A13\u7DF4\u91CF ");
  sparkline(g2, gymVolumeByMonth, GREEN[1]);
  const g3 = sparks.createDiv();
  g3.appendText("Golf sessions / \u9AD8\u723E\u592B ");
  sparkline(g3, golfSessionsByMonth, ORANGE[2]);
  const monthTable = root.createEl("table");
  const thead = monthTable.createEl("thead");
  const hr = thead.createEl("tr");
  for (const h of [
    "Month / \u6708",
    "Gym / \u5065\u8EAB",
    "Volume / \u8A13\u7DF4\u91CF (kg)",
    "Golf / \u9AD8\u723E\u592B"
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
  root.createEl("h3", { text: "Muscles / \u808C\u7FA4" });
  const mTable = root.createEl("table");
  const mHead = mTable.createEl("thead").createEl("tr");
  for (const h of ["Muscle / \u808C\u7FA4", "Sets / \u7D44\u6578", "Volume / \u8A13\u7DF4\u91CF (kg)"]) {
    mHead.createEl("th", { text: h });
  }
  const mBody = mTable.createEl("tbody");
  const muscles = /* @__PURE__ */ new Set([...muscleFreq.keys(), ...muscleVolume.keys()]);
  const muscleRows = [...muscles].map((m) => ({
    m,
    freq: muscleFreq.get(m) || 0,
    vol: muscleVolume.get(m) || 0
  }));
  muscleRows.sort(
    (a, b) => b.vol - a.vol || b.freq - a.freq || a.m.localeCompare(b.m)
  );
  if (!muscleRows.length) {
    const tr = mBody.createEl("tr");
    tr.createEl("td", {
      text: "No set data / \u5C1A\u7121\u7D44\u6578\u8CC7\u6599",
      attr: { colspan: "3" }
    }).addClass("fitness-muted");
  } else {
    for (const r of muscleRows) {
      const tr = mBody.createEl("tr");
      tr.createEl("td", { text: r.m });
      tr.createEl("td", { text: String(r.freq) });
      tr.createEl("td", { text: fmtKg(r.vol) });
    }
  }
  root.createEl("h3", { text: "Golf focus / \u9AD8\u723E\u592B\u91CD\u9EDE" });
  const focusUl = root.createEl("ul");
  const focuses = sortMapDesc(focusCounts);
  if (!focuses.length) {
    focusUl.createEl("li", {
      text: "No focus tags / \u5C1A\u7121\u91CD\u9EDE\u6A19\u7C64",
      cls: "fitness-muted"
    });
  } else {
    for (const [name, count] of focuses) {
      focusUl.createEl("li", { text: `${name}: ${count}` });
    }
  }
  root.createEl("h3", { text: "Recent sessions / \u6700\u8FD1\u8A13\u7DF4" });
  const recentUl = root.createEl("ul");
  if (!recent10.length) {
    recentUl.createEl("li", {
      text: "No sessions yet / \u5C1A\u672A\u8A18\u9304",
      cls: "fitness-muted"
    });
  } else {
    for (const r of recent10) {
      const li = recentUl.createEl("li");
      li.appendText(`${r.date} \xB7 ${r.label}: `);
      const a = li.createEl("a", { cls: "fitness-link", text: r.path });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        void data.openPath(r.path);
      });
    }
  }
}

// src/views/heatmap.ts
var DAY_NAMES = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
function colorFor(series, level) {
  if (!level)
    return EMPTY_CELL;
  return series.colors[level - 1] || series.colors[series.colors.length - 1];
}
function durationMap(data, series, year) {
  const map = /* @__PURE__ */ new Map();
  for (const s of data.listSessions(series.folder, year)) {
    if (!s.date)
      continue;
    const entry = map.get(s.date) || { minutes: 0, path: null };
    entry.minutes += s.duration_min;
    if (!entry.path)
      entry.path = s.path;
    map.set(s.date, entry);
  }
  return map;
}
function renderOneHeatmap(root, data, series, year, timezone) {
  const wrap = root.createDiv({ cls: "fitness-heatmap" });
  wrap.createEl("h4", { cls: "fitness-heatmap-title", text: series.label });
  const legend = wrap.createDiv({ cls: "fitness-heatmap-legend" });
  legend.createSpan({ text: "Less / \u5C11" });
  legend.createDiv({ cls: "fitness-legend-swatch" }).style.background = EMPTY_CELL;
  for (const c of series.colors) {
    const sw = legend.createDiv({ cls: "fitness-legend-swatch" });
    sw.style.background = c;
  }
  legend.createSpan({ text: "More / \u591A" });
  legend.createSpan({
    text: "by duration / \u6309\u6642\u9577",
    attr: { style: "margin-left:8px" }
  });
  const activityMap = durationMap(data, series, year);
  const todayStr = ymdInZone(/* @__PURE__ */ new Date(), timezone);
  const start = { y: year, m: 1, d: 1 };
  const end = { y: year, m: 12, d: 31 };
  const jan1Dow = weekdaySun0(start.y, start.m, start.d);
  const daysToSubtract = jan1Dow;
  let cursor = addDays(start.y, start.m, start.d, -daysToSubtract);
  const weeks = [];
  let weekCount = 0;
  const endYmd = formatYmd(end.y, end.m, end.d);
  while (weekCount < 60) {
    if (formatYmd(cursor.y, cursor.m, cursor.d) > endYmd)
      break;
    const week = [];
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
        d: cursor.d
      });
      cursor = addDays(cursor.y, cursor.m, cursor.d, 1);
    }
    weeks.push(week);
    weekCount++;
  }
  const monthRow = wrap.createDiv({ cls: "fitness-month-row" });
  let lastMonth = "";
  for (const week of weeks) {
    if (!week.length)
      continue;
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
      const color = day.isCurrentYear ? colorFor(series, day.level) : EMPTY_CELL;
      const cell = col.createDiv({
        cls: "fitness-cell" + (day.isToday ? " is-today" : "") + (day.isCurrentYear ? "" : " is-faded") + (day.path ? " is-link" : "")
      });
      cell.style.backgroundColor = color;
      const tip = day.path ? `${day.fullDate}: ${day.minutes} min / \u5206\u9418 \u2014 click to open / \u9EDE\u64CA\u958B\u555F` : `${day.fullDate}: ${day.minutes} min / \u5206\u9418`;
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
function renderHeatmaps(el, data, seriesList, year, timezone) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  for (const s of seriesList) {
    renderOneHeatmap(root, data, s, year, timezone);
  }
}
function resolveHeatmapYear(opts, sourcePath, timezone) {
  if (opts.year && Number(opts.year))
    return Number(opts.year);
  const fromPath = parseYmd(
    sourcePath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || ""
  );
  if (fromPath)
    return fromPath.y;
  return Number(ymdInZone(/* @__PURE__ */ new Date(), timezone).slice(0, 4));
}

// src/views/today.ts
function resolveTodayDate(opts, sourcePath, timezone) {
  if (opts.date && parseYmd(opts.date))
    return opts.date;
  const fromPath = extractYmdFromPath(sourcePath);
  if (fromPath)
    return fromPath;
  return ymdInZone(/* @__PURE__ */ new Date(), timezone);
}
function renderTodaySessions(el, data, seriesList, dateStr) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const box = root.createDiv();
  box.createEl("strong", { text: "\u{1F5C2}\uFE0F Today\u2019s sessions / \u4ECA\u65E5\u8A13\u7DF4" });
  const ul = box.createEl("ul");
  const year = Number(dateStr.slice(0, 4));
  for (const s of seriesList) {
    const path = `${s.folder}/${year}/${dateStr}.md`;
    const li = ul.createEl("li");
    li.appendText(`${s.label}: `);
    if (data.exists(path)) {
      const a = li.createEl("a", {
        cls: "fitness-link",
        text: dateStr
      });
      a.addEventListener("click", (e) => {
        e.preventDefault();
        void data.openPath(path);
      });
    } else {
      li.createEl("em", {
        cls: "fitness-muted",
        text: "no session yet / \u5C1A\u672A\u8A18\u9304"
      });
    }
  }
}

// src/codeblocks.ts
function frontmatterYear(plugin, sourcePath) {
  const cache = plugin.app.metadataCache.getCache(sourcePath);
  return cache?.frontmatter?.year;
}
async function renderBlock(plugin, kind, source, el, ctx) {
  const opts = parseBlockOptions(source);
  const sourcePath = ctx.sourcePath || "";
  const data = plugin.data;
  const settings = plugin.settings;
  const series = settings.series;
  const tz = settings.timezone;
  try {
    switch (kind) {
      case "fitness-heatmap": {
        const year = resolveHeatmapYear(opts, sourcePath, tz);
        renderHeatmaps(el, data, series, year, tz);
        break;
      }
      case "fitness-today": {
        const dateStr = resolveTodayDate(opts, sourcePath, tz);
        renderTodaySessions(el, data, series, dateStr);
        break;
      }
      case "fitness-dashboard": {
        const year = resolveDashboardYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz
        );
        await renderDashboard(el, data, series, year, settings.cuesPath);
        break;
      }
      case "fitness-cues": {
        const year = resolveCuesYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz
        );
        await renderGolfCues(el, data, series, year, tz);
        break;
      }
      case "fitness-actions": {
        renderActions(el, plugin);
        break;
      }
      default:
        el.createEl("p", { text: `Unknown fitness block: ${kind}` });
    }
  } catch (err) {
    console.error("Fitness block error", kind, err);
    el.empty();
    el.createEl("p", {
      text: `Fitness error: ${err instanceof Error ? err.message : String(err)}`,
      cls: "mod-warning"
    });
  }
}
function registerCodeblocks(plugin) {
  const kinds = [
    "fitness-heatmap",
    "fitness-today",
    "fitness-dashboard",
    "fitness-cues",
    "fitness-actions"
  ];
  for (const kind of kinds) {
    plugin.registerMarkdownCodeBlockProcessor(
      kind,
      async (source, el, ctx) => {
        plugin.trackLiveBlock({ kind, el, source, sourcePath: ctx.sourcePath });
        await renderBlock(plugin, kind, source, el, ctx);
      }
    );
  }
}

// src/data/vault-source.ts
var import_obsidian2 = require("obsidian");

// src/util/vault-path.ts
function normalizeSlashes(path) {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
function isSafeVaultFolder(folder) {
  if (typeof folder !== "string")
    return false;
  const trimmed = folder.trim();
  if (!trimmed)
    return false;
  const normalized = normalizeSlashes(trimmed);
  if (!normalized || normalized === "/")
    return false;
  if (normalized.startsWith("/"))
    return false;
  if (/^[a-zA-Z]:/.test(normalized))
    return false;
  const segments = normalized.replace(/\/$/, "").split("/");
  if (segments.length === 0)
    return false;
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..")
      return false;
  }
  return true;
}
function sessionScanPrefix(folder, year) {
  if (!isSafeVaultFolder(folder))
    return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/${year}/`;
}

// src/data/vault-source.ts
function asList(value) {
  if (value == null || value === "")
    return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const s = String(value).trim();
  return s ? [s] : [];
}
function resolveDate(frontmatter, basename) {
  if (frontmatter?.date != null && frontmatter.date !== "") {
    const raw = String(frontmatter.date);
    const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (m)
      return m[1];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(basename))
    return basename;
  return null;
}
var VaultDataSource = class {
  constructor(app) {
    this.app = app;
  }
  listSessions(folder, year) {
    const prefix = sessionScanPrefix(folder, year);
    if (!prefix)
      return [];
    const scanPrefix = (0, import_obsidian2.normalizePath)(prefix.replace(/\/$/, "")) + "/";
    const out = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(scanPrefix))
        continue;
      if (!file.path.endsWith(".md"))
        continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter ?? {};
      out.push({
        path: file.path,
        basename: file.basename,
        date: resolveDate(fm, file.basename),
        duration_min: Number(fm.duration_min) || 0,
        weight_unit: fm.weight_unit === "lb" ? "lb" : "kg",
        focus: asList(fm.focus),
        felt: String(fm.felt || "")
      });
    }
    return out;
  }
  async readBody(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian2.normalizePath)(path));
    if (!(af instanceof import_obsidian2.TFile))
      return "";
    return this.app.vault.read(af);
  }
  exists(path) {
    return !!this.app.vault.getAbstractFileByPath((0, import_obsidian2.normalizePath)(path));
  }
  async ensureFolder(folderPath) {
    const norm = (0, import_obsidian2.normalizePath)(folderPath);
    if (this.app.vault.getAbstractFileByPath(norm))
      return;
    const parts = norm.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(cur)) {
        await this.app.vault.createFolder(cur);
      }
    }
  }
  async createNote(path, content) {
    const norm = (0, import_obsidian2.normalizePath)(path);
    const parent = norm.includes("/") ? norm.slice(0, norm.lastIndexOf("/")) : "";
    if (parent)
      await this.ensureFolder(parent);
    return this.app.vault.create(norm, content);
  }
  async openPath(path) {
    const norm = (0, import_obsidian2.normalizePath)(path);
    const file = this.app.vault.getAbstractFileByPath(norm);
    if (file instanceof import_obsidian2.TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
      return;
    }
    await this.app.workspace.openLinkText(norm, "", false);
  }
  getFileByPath(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian2.normalizePath)(path));
    return af instanceof import_obsidian2.TFile ? af : null;
  }
  isUnderSeriesFolder(path, folders) {
    const norm = (0, import_obsidian2.normalizePath)(path);
    return folders.some((f) => {
      if (!isSafeVaultFolder(f))
        return false;
      const p = (0, import_obsidian2.normalizePath)(f);
      return norm === p || norm.startsWith(p + "/");
    });
  }
  getFolder(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian2.normalizePath)(path));
    return af instanceof import_obsidian2.TFolder ? af : null;
  }
};

// src/settings.ts
var import_obsidian3 = require("obsidian");
function sanitizeSeries(series, fallback) {
  if (!Array.isArray(series) || series.length === 0)
    return fallback;
  const safe = series.filter(
    (s) => s != null && typeof s.folder === "string" && isSafeVaultFolder(s.folder)
  );
  return safe.length > 0 ? safe : fallback;
}
function mergeSettings(raw) {
  const base = { ...DEFAULT_SETTINGS };
  if (!raw)
    return base;
  return {
    timezone: raw.timezone || base.timezone,
    dashboardPath: raw.dashboardPath || base.dashboardPath,
    cuesPath: raw.cuesPath || base.cuesPath,
    series: sanitizeSeries(raw.series, base.series)
  };
}
var FitnessSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Fitness" });
    new import_obsidian3.Setting(containerEl).setName("Timezone").setDesc("IANA timezone for \u201Ctoday\u201D and session dates (e.g. Asia/Hong_Kong).").addText(
      (text) => text.setPlaceholder("Asia/Hong_Kong").setValue(this.plugin.settings.timezone).onChange(async (value) => {
        this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
        await this.plugin.saveSettings();
        this.plugin.refreshAll();
      })
    );
    new import_obsidian3.Setting(containerEl).setName("Dashboard path").setDesc("Vault-relative path opened by \u201COpen dashboard\u201D.").addText(
      (text) => text.setPlaceholder("Fitness/Dashboard.md").setValue(this.plugin.settings.dashboardPath).onChange(async (value) => {
        this.plugin.settings.dashboardPath = value.trim() || DEFAULT_SETTINGS.dashboardPath;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(containerEl).setName("Cues path").setDesc("Vault-relative path for golf cue rollup note.").addText(
      (text) => text.setPlaceholder("Golf/Cues.md").setValue(this.plugin.settings.cuesPath).onChange(async (value) => {
        this.plugin.settings.cuesPath = value.trim() || DEFAULT_SETTINGS.cuesPath;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("p", {
      text: "Series (folders, labels, colors) use defaults: Gym + Golf. Edit plugin data.json advanced series later if needed.",
      cls: "setting-item-description"
    });
  }
};

// src/main.ts
var FitnessPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.liveBlocks = [];
    this.refreshTimer = null;
  }
  async onload() {
    this.data = new VaultDataSource(this.app);
    await this.loadSettings();
    registerCodeblocks(this);
    this.addSettingTab(new FitnessSettingTab(this.app, this));
    this.addCommand({
      id: "fitness-new-gym-session",
      name: "New gym session",
      callback: () => {
        void this.createGymSession();
      }
    });
    this.addCommand({
      id: "fitness-new-golf-session",
      name: "New golf session",
      callback: () => {
        void this.createGolfSession();
      }
    });
    this.addCommand({
      id: "fitness-open-dashboard",
      name: "Open dashboard",
      callback: () => {
        void this.openDashboard();
      }
    });
    const schedule = () => this.scheduleRefresh();
    this.registerEvent(this.app.vault.on("create", schedule));
    this.registerEvent(this.app.vault.on("modify", schedule));
    this.registerEvent(this.app.vault.on("delete", schedule));
    this.registerEvent(this.app.vault.on("rename", schedule));
    this.registerEvent(this.app.metadataCache.on("resolved", schedule));
  }
  onunload() {
    this.liveBlocks = [];
    if (this.refreshTimer != null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  async loadSettings() {
    this.settings = mergeSettings(await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  trackLiveBlock(block) {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el.isConnected);
    this.liveBlocks = this.liveBlocks.filter((b) => b.el !== block.el);
    this.liveBlocks.push(block);
  }
  scheduleRefresh() {
    if (this.refreshTimer != null)
      window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshAll();
    }, 200);
  }
  async refreshAll() {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el.isConnected);
    for (const block of this.liveBlocks) {
      const ctx = {
        sourcePath: block.sourcePath
      };
      await renderBlock(this, block.kind, block.source, block.el, ctx);
    }
  }
  seriesByKind(kind) {
    return this.settings.series.find((s) => s.kind === kind);
  }
  async createGymSession() {
    const series = this.seriesByKind("gym");
    if (!series) {
      new import_obsidian4.Notice("No gym series configured");
      return;
    }
    await createGymSession(
      this.app,
      this.data,
      series,
      this.settings.timezone
    );
  }
  async createGolfSession() {
    const series = this.seriesByKind("golf");
    if (!series) {
      new import_obsidian4.Notice("No golf series configured");
      return;
    }
    await createGolfSession(
      this.app,
      this.data,
      series,
      this.settings.timezone
    );
  }
  async openDashboard() {
    const path = this.settings.dashboardPath;
    if (!this.data.exists(path)) {
      new import_obsidian4.Notice(`Dashboard not found: ${path}`);
      return;
    }
    await this.data.openPath(path);
  }
};
