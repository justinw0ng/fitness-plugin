/**
 * Seed /workspace/obsidian-demo for README hero screenshot (Task 7).
 * Run: node scripts/seed-readme-demo-vault.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VAULT = "/workspace/obsidian-demo";
const TODAY = "2026-08-11";
const YEAR = "2026";

const BOOKS = [
  { title: "Theo of Golden", cover: "https://covers.openlibrary.org/b/id/15205233-L.jpg" },
  { title: "The Calamity Club", cover: "https://covers.openlibrary.org/b/id/15236189-L.jpg" },
  { title: "Yesteryear", cover: "https://covers.openlibrary.org/b/id/15234864-L.jpg" },
  { title: "Whistler", cover: "https://covers.openlibrary.org/b/id/15234903-L.jpg" },
  { title: "Dungeon Crawler Carl", cover: "https://covers.openlibrary.org/b/id/15143022-L.jpg" },
  { title: "Project Hail Mary", cover: "https://covers.openlibrary.org/b/id/11200092-L.jpg" },
  { title: "Regime Change", cover: "https://covers.openlibrary.org/b/id/15232516-L.jpg" },
  { title: "The Odyssey", cover: "https://covers.openlibrary.org/b/id/8100018-L.jpg" },
  { title: "The Wedding People", cover: "https://covers.openlibrary.org/b/id/15127690-L.jpg" },
  { title: "The Let Them Theory", cover: "https://covers.openlibrary.org/b/id/15165806-L.jpg" },
  { title: "Orbital", cover: "https://covers.openlibrary.org/b/id/15185440-L.jpg" },
  { title: "The Anxious Generation", cover: "https://covers.openlibrary.org/b/id/15166829-L.jpg" },
];

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

function seedHeatmapSessions() {
  const gymDates = [
    ["2026-01-03", 35],
    ["2026-01-06", 45],
    ["2026-01-22", 50],
    ["2026-02-10", 60],
    ["2026-02-26", 40],
    ["2026-03-15", 50],
    ["2026-03-29", 55],
    ["2026-04-22", 55],
    ["2026-04-30", 45],
    ["2026-05-08", 40],
    ["2026-05-27", 60],
    ["2026-06-12", 65],
    ["2026-06-26", 50],
    ["2026-07-03", 50],
    ["2026-07-28", 45],
    ["2026-07-31", 35],
    ["2026-08-05", 55],
    [TODAY, 45],
  ];
  for (const [date, min] of gymDates) {
    write(
      join(VAULT, `atomics/exercise/Gym/${YEAR}/${date}.md`),
      gymSession(date, min),
    );
  }

  const golfDates = [
    ["2026-01-12", 90],
    ["2026-01-25", 60],
    ["2026-02-28", 75],
    ["2026-03-09", 65],
    ["2026-04-05", 80],
    ["2026-04-23", 55],
    ["2026-05-20", 70],
    ["2026-06-10", 75],
    ["2026-06-30", 85],
    ["2026-07-15", 60],
    ["2026-07-26", 50],
    ["2026-08-02", 75],
    [TODAY, 30],
  ];
  for (const [date, min] of golfDates) {
    write(
      join(VAULT, `atomics/exercise/Golf/${YEAR}/${date}.md`),
      golfSession(date, min),
    );
  }
}

function seedHobbyTimeLogs() {
  const readingLogs = [];
  const guitarLogs = [];
  const spread = [
    ["2026-01-08", 30],
    ["2026-01-21", 25],
    ["2026-02-14", 45],
    ["2026-02-27", 35],
    ["2026-03-21", 35],
    ["2026-04-03", 28],
    ["2026-04-18", 50],
    ["2026-05-07", 30],
    ["2026-05-25", 40],
    ["2026-06-02", 32],
    ["2026-06-08", 55],
    ["2026-07-01", 26],
    ["2026-07-19", 35],
    ["2026-07-29", 38],
    ["2026-08-03", 42],
    [TODAY, 40],
  ];
  for (const [date, min] of spread) {
    readingLogs.push(`- ${date} | ${min} min`);
    guitarLogs.push(`- ${date} | ${min === 40 ? 25 : Math.max(15, min - 10)} min`);
  }

  const [first, ...rest] = BOOKS;
  write(
    join(VAULT, `atomics/hobbies/Reading/Items/${first.title}.md`),
    readingItem(first.title, first.cover, 40, readingLogs),
  );
  for (const book of rest) {
    write(
      join(VAULT, `atomics/hobbies/Reading/Items/${book.title}.md`),
      readingItem(book.title, book.cover, 0),
    );
  }

  write(
    join(VAULT, "atomics/hobbies/Guitar/Items/Practice log.md"),
    guitarItem(25, guitarLogs),
  );
}

function seedDailyNote() {
  write(
    join(VAULT, `Daily notes/${TODAY}.md`),
    `# Tuesday, August 11, 2026

\`\`\`atomic-bookshelf
\`\`\`

\`\`\`atomic-actions
\`\`\`

\`\`\`atomic-heatmap
activity: gym, golf, guitar, reading
columns: 2
rows: 2
year: ${YEAR}
\`\`\`

\`\`\`atomic-today
\`\`\`
`,
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
      },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "appearance.json"),
    JSON.stringify({ theme: "moonstone", accentColor: "" }, null, 2),
  );

  write(
    join(obsidianDir, "community-plugins.json"),
    JSON.stringify(["obsidian-atomic"], null, 2),
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
    deprecatedFitnessBlocksEnabled: false,
    activityTypes: [
      {
        id: "gym",
        domain: "exercise",
        label: "Gym",
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
        label: "Golf",
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
        label: "Guitar",
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
        label: "Reading",
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

  const pluginDir = join(obsidianDir, "plugins/obsidian-atomic");
  ensureDir(pluginDir);
  write(join(pluginDir, "data.json"), JSON.stringify(pluginData, null, 2));
}

function deployPlugin() {
  const pluginDir = join(VAULT, ".obsidian/plugins/obsidian-atomic");
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
seedHeatmapSessions();
seedHobbyTimeLogs();
seedDailyNote();

write(
  join(VAULT, "atomics/Dashboard.md"),
  `# Dashboard\n\n\`\`\`atomic-dashboard\nyear: ${YEAR}\n\`\`\`\n`,
);

console.log(`Seeded demo vault at ${VAULT}`);
