/**
 * Seed /workspace/obsidian-demo for README hero screenshot (Task 7).
 * Run: node scripts/seed-readme-demo-vault.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHeroBookLimit } from "./hero-capture-options.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const VAULT = "/workspace/obsidian-demo";
const TODAY = "2026-08-11";
const YEAR = "2026";

const BOOKS = [
  { title: "The Unhurried Advantage", slug: "the-unhurried-advantage" },
  { title: "Ship Before You Brand", slug: "ship-before-you-brand" },
  { title: "Evenings Without Email", slug: "evenings-without-email" },
  { title: "The Practice of Enough", slug: "the-practice-of-enough" },
  { title: "Decisions in Daylight", slug: "decisions-in-daylight" },
  { title: "Skill Before Scale", slug: "skill-before-scale" },
  { title: "The Honest Hour", slug: "the-honest-hour" },
  { title: "White Space First", slug: "white-space-first" },
  { title: "The Narrow Yes", slug: "the-narrow-yes" },
  { title: "Work That Leaves", slug: "work-that-leaves" },
  { title: "Drafts Before Decks", slug: "drafts-before-decks" },
  { title: "A Smaller Ambition", slug: "a-smaller-ambition" },
];

const bookLimit = parseHeroBookLimit(process.argv.slice(2), BOOKS.length);
const heroBooks = BOOKS.slice(0, bookLimit);

const GREEN = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];
const ORANGE = ["#ffd8a8", "#ffa94d", "#f76707", "#d9480f"];
const BLUE = ["#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"];
const PURPLE = ["#eebefa", "#da77f2", "#ae3ec9", "#862e9c"];

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function write(p, content) {
  ensureDir(join(p, ".."));
  writeFileSync(p, content, "utf8");
}

function coverWikilink(slug) {
  return `[[atomics/hobbies/Reading/Covers/${slug}.png]]`;
}

function readingItem(title, cover, totalMin, timeLogLines = []) {
  const lines = timeLogLines.length
    ? timeLogLines
    : [`- ${TODAY} 09:00-09:${String(totalMin).padStart(2, "0")} | ${totalMin} min`];
  return `---
type: atomic-item
domain: hobby
activity: reading
status: reading
authors:
  - ""
description: ""
pages:
cover: "${cover}"
tags:
  - books
spine_color:
total_min: ${totalMin}
timer_started_at:
related_canvas:
---

# ${title}

## Remarks

## Time log

${lines.join("\n")}

\`\`\`atomic-timer
\`\`\`
`;
}

function guitarItem(totalMin, timeLogLines) {
  return `---
type: atomic-item
domain: hobby
activity: guitar
status: reading
authors:
  - ""
description: ""
pages:
cover: ""
tags:
spine_color: "#ae3ec9"
total_min: ${totalMin}
timer_started_at:
related_canvas:
---

# Practice log

## Remarks

## Time log

${timeLogLines.join("\n")}

\`\`\`atomic-timer
\`\`\`
`;
}

function gymSession(date, durationMin, location = "Commercial") {
  return `---
type: session
date: ${date}
activity: gym
duration_min: ${durationMin}
location: ${location}
location_detail: ""
weight_unit: kg
---

# Gym — ${date}

| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 80 | 5 | |
| Bench | Chest | 60 | 8 | |

## Reminders

- 
`;
}

function golfSession(date, durationMin, felt = "good") {
  return `---
type: session
date: ${date}
activity: golf
duration_min: ${durationMin}
location: Course
focus: []
club: []
felt: ${felt}
---

# Golf — ${date}

## Reminders

- Short game focus
`;
}

/** Deterministic dense activity days through TODAY (inclusive). */
function activityDays({ startMonth, weekdays, stride = 1 }) {
  const out = [];
  const end = new Date(`${TODAY}T12:00:00Z`);
  for (let month = startMonth; month <= end.getUTCMonth() + 1; month++) {
    const daysInMonth = new Date(Date.UTC(2026, month, 0)).getUTCDate();
    let hit = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dt = new Date(`${iso}T12:00:00Z`);
      if (dt > end) break;
      const dow = dt.getUTCDay(); // 0 Sun … 6 Sat
      if (!weekdays.includes(dow)) continue;
      hit += 1;
      if (hit % stride !== 0) continue;
      out.push(iso);
    }
  }
  if (!out.includes(TODAY)) out.push(TODAY);
  return out;
}

function durationFor(date, base, spread) {
  const n = Number(date.slice(-2));
  return base + ((n * 7) % spread);
}

function seedHeatmapSessions() {
  // Gym: Mon/Wed/Fri-ish density (~3×/week)
  const gymDates = activityDays({ startMonth: 1, weekdays: [1, 3, 5] });
  for (const date of gymDates) {
    write(
      join(VAULT, `atomics/exercise/Gym/${YEAR}/${date}.md`),
      gymSession(date, durationFor(date, 40, 30)),
    );
  }

  // Golf: weekends + occasional midweek
  const golfDates = activityDays({ startMonth: 1, weekdays: [0, 6, 3], stride: 1 });
  for (const date of golfDates) {
    write(
      join(VAULT, `atomics/exercise/Golf/${YEAR}/${date}.md`),
      golfSession(date, durationFor(date, 60, 40)),
    );
  }
}

function seedHobbyTimeLogs() {
  const readingLogs = [];
  const guitarLogs = [];
  // Reading most evenings; guitar nearly daily
  const readingDays = activityDays({ startMonth: 1, weekdays: [0, 1, 2, 3, 4, 5, 6], stride: 2 });
  const guitarDays = activityDays({ startMonth: 1, weekdays: [1, 2, 3, 4, 5, 6] });

  for (const date of readingDays) {
    const min = durationFor(date, 25, 35);
    readingLogs.push(`- ${date} | ${min} min`);
  }
  for (const date of guitarDays) {
    const min = durationFor(date, 15, 25);
    guitarLogs.push(`- ${date} | ${min} min`);
  }

  const readingTotal = readingLogs.reduce((sum, line) => {
    const m = line.match(/(\d+) min/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);
  const guitarTotal = guitarLogs.reduce((sum, line) => {
    const m = line.match(/(\d+) min/);
    return sum + (m ? Number(m[1]) : 0);
  }, 0);

  const [first, ...rest] = heroBooks;
  const coversDir = join(VAULT, "atomics/hobbies/Reading/Covers");
  ensureDir(coversDir);
  for (const book of heroBooks) {
    const src = join(ROOT, `docs/demo-covers/${book.slug}.png`);
    if (!existsSync(src)) throw new Error(`Missing demo cover ${src}`);
    copyFileSync(src, join(coversDir, `${book.slug}.png`));
  }
  write(
    join(VAULT, `atomics/hobbies/Reading/Items/${first.title}.md`),
    readingItem(first.title, coverWikilink(first.slug), readingTotal, readingLogs),
  );
  for (const book of rest) {
    write(
      join(VAULT, `atomics/hobbies/Reading/Items/${book.title}.md`),
      readingItem(book.title, coverWikilink(book.slug), 0),
    );
  }

  write(
    join(VAULT, "atomics/hobbies/Guitar/Items/Practice log.md"),
    guitarItem(guitarTotal, guitarLogs),
  );
}

function seedDailyNote() {
  write(
    join(VAULT, `Daily notes/${TODAY}.md`),
    readFileSync(join(ROOT, "examples/daily-notes/2026-08-11.md"), "utf8"),
  );
}

function seedObsidianConfig() {
  const obsidianDir = join(VAULT, ".obsidian");
  ensureDir(obsidianDir);

  write(
    join(obsidianDir, "app.json"),
    JSON.stringify(
      {
        readableLineLength: false,
        theme: "moonstone",
        accentColor: "",
        baseFontSize: 16,
        showLineNumber: false,
        strictLineBreaks: false,
        livePreview: true,
      },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "appearance.json"),
    JSON.stringify(
      {
        theme: "moonstone",
        accentColor: "",
        showRibbon: true,
        enabledCssSnippets: [],
      },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "community-plugins.json"),
    JSON.stringify(["atomic-tracker"], null, 2),
  );

  write(
    join(obsidianDir, "core-plugins.json"),
    JSON.stringify(
      {
        "file-explorer": true,
        "global-search": true,
        switcher: true,
        graph: false,
        backlink: false,
        canvas: false,
        "outgoing-link": false,
        "tag-pane": false,
        "page-preview": true,
        "daily-notes": true,
        templates: false,
        "note-composer": true,
        "command-palette": true,
        "slash-command": false,
        "editor-status": true,
        bookmarks: false,
        "markdown-importer": false,
        "zk-prefixer": false,
        "random-note": false,
        outline: true,
        "word-count": false,
        slides: false,
        "audio-recorder": false,
        workspaces: false,
        "file-recovery": true,
        publish: false,
        sync: false,
        webviewer: false,
        footnotes: false,
        properties: false,
      },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "daily-notes.json"),
    JSON.stringify(
      { format: "YYYY-MM-DD", folder: "Daily notes", template: "" },
      null,
      2,
    ),
  );

  const pluginData = {
    language: "en",
    timezone: "America/New_York",
    dashboardPath: "atomics/Dashboard.md",
    golfCuesPath: "atomics/exercise/Golf/Cues.md",
    gymCuesPath: "atomics/exercise/Gym/Cues.md",
    activityTypes: [
      {
        id: "gym",
        domain: "exercise",
        label: "🏋️ Gym",
        folder: "atomics/exercise/Gym",
        enabled: true,
        baseColor: GREEN[2],
        colors: GREEN,
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: true,
      },
      {
        id: "golf",
        domain: "exercise",
        label: "⛳ Golf",
        folder: "atomics/exercise/Golf",
        enabled: true,
        baseColor: ORANGE[2],
        colors: ORANGE,
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: false,
      },
      {
        id: "guitar",
        domain: "hobby",
        label: "🎸 Guitar",
        folder: "atomics/hobbies/Guitar",
        enabled: true,
        baseColor: PURPLE[2],
        colors: PURPLE,
        noteModel: "item",
        supportsCues: false,
        supportsTimer: true,
        supportsSetTable: false,
      },
      {
        id: "reading",
        domain: "hobby",
        label: "📚 Reading",
        folder: "atomics/hobbies/Reading",
        enabled: true,
        baseColor: BLUE[2],
        colors: BLUE,
        noteModel: "item",
        supportsCues: false,
        supportsTimer: true,
        supportsSetTable: false,
      },
    ],
  };

  const pluginDir = join(obsidianDir, "plugins/atomic-tracker");
  ensureDir(pluginDir);
  write(join(pluginDir, "data.json"), JSON.stringify(pluginData, null, 2));

  for (const staleId of ["obsidian-atomic", "obsidian-fitness"]) {
    const staleDir = join(obsidianDir, "plugins", staleId);
    if (existsSync(staleDir)) rmSync(staleDir, { recursive: true, force: true });
  }
}

function deployPlugin() {
  const pluginDir = join(VAULT, ".obsidian/plugins/atomic-tracker");
  ensureDir(pluginDir);
  for (const file of ["main.js", "manifest.json", "styles.css"]) {
    const src = join("/workspace", file);
    if (!existsSync(src)) throw new Error(`Missing ${src}`);
    writeFileSync(join(pluginDir, file), readFileSync(src));
  }
}

ensureDir(VAULT);
seedObsidianConfig();
deployPlugin();

// Drop prior demo sessions/items so denser seeds replace sparse ones cleanly.
for (const rel of [
  "atomics/exercise/Gym/2026",
  "atomics/exercise/Golf/2026",
  "atomics/hobbies/Reading/Items",
  "atomics/hobbies/Guitar/Items",
]) {
  const p = join(VAULT, rel);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

seedHeatmapSessions();
seedHobbyTimeLogs();
seedDailyNote();

write(
  join(VAULT, "atomics/Dashboard.md"),
  readFileSync(join(ROOT, "examples/dashboard/Dashboard.md"), "utf8"),
);

console.log(`Seeded demo vault at ${VAULT} with ${bookLimit} books`);
