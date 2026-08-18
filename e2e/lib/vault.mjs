/**
 * Seed a small English-language vault for the Selenium health check.
 * Safe to call from unit tests with deployPlugin: false.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const E2E_VAULT_ID = "atomicE2e000001";
export const DEFAULT_E2E_VAULT = "/tmp/atomic-tracker-e2e-vault";
export const E2E_TIMEZONE = "UTC";

export const E2E_FILES = {
  golfCues: "E2E/Golf cues.md",
  gymCues: "E2E/Gym cues.md",
  cues: "E2E/Cues.md",
  heatmapAll: "E2E/Heatmap all.md",
  heatmapReading: "E2E/Heatmap reading.md",
  heatmapGymGolf: "E2E/Heatmap gym golf.md",
  bookshelfAll: "E2E/Bookshelf all.md",
  bookshelfReading: "E2E/Bookshelf reading.md",
  bookshelfScaled: "E2E/Bookshelf scaled.md",
  readingCurrent: "atomics/hobbies/Reading/Items/Currently Reading.md",
  readingFinished: "atomics/hobbies/Reading/Items/Finished Book.md",
  golfSession: (year, today) => `atomics/exercise/Golf/${year}/${today}.md`,
  gymSession: (year, today) => `atomics/exercise/Gym/${year}/${today}.md`,
};

const GREEN = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];
const ORANGE = ["#ffd8a8", "#ffa94d", "#f76707", "#d9480f"];
const BLUE = ["#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"];

export function utcToday(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function write(p, content) {
  ensureDir(dirname(p));
  writeFileSync(p, content, "utf8");
}

export function assertSafeE2eVaultPath(vaultPath) {
  if (typeof vaultPath !== "string" || !vaultPath.trim()) {
    throw new Error("E2E vault path is empty");
  }
  const resolved = resolve(vaultPath);
  const repoRoot = resolve(ROOT);
  const forbidden = [
    resolve("/"),
    repoRoot,
    resolve(homedir()),
    resolve(tmpdir()),
    resolve("/tmp"),
    resolve("/var"),
    resolve("/usr"),
    resolve("/etc"),
  ];
  if (forbidden.includes(resolved)) {
    throw new Error(`Refusing to delete ${resolved}`);
  }
  if (resolved.startsWith(repoRoot + sep)) {
    throw new Error(`Refusing to delete ${resolved} (inside the repository)`);
  }
  const tmpPrefix = resolve(tmpdir()) + sep;
  const underTmp =
    resolved.startsWith(tmpPrefix) ||
    resolved.startsWith("/tmp/") ||
    resolved.startsWith("/var/tmp/");
  const e2eNamed = /e2e/i.test(basename(resolved));
  if (!underTmp && !e2eNamed) {
    throw new Error(
      `Refusing to wipe ${resolved}. Use a temp directory or a path whose name contains "e2e".`,
    );
  }
}

function readingItem({ title, status, totalMin, timeLog }) {
  return `---
type: atomic-item
domain: hobby
activity: reading
status: ${status}
authors:
  - ""
description: ""
pages:
cover: ""
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

${timeLog}

\`\`\`atomic-timer
\`\`\`
`;
}

function gymSession(date) {
  return `---
type: session
date: ${date}
activity: gym
duration_min: 45
location: Commercial
location_detail: ""
weight_unit: kg
---

# Gym — ${date}

\`\`\`atomic-gym-log
# No options. Pick an exercise, enter weight and reps, then add a set to this note's table.
\`\`\`

| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 80 | 5 | |

## Reminders

- Brace the core
`;
}

function golfSession(date) {
  return `---
type: session
date: ${date}
activity: golf
duration_min: 60
location: Course
focus: []
club: []
felt: good
---

# Golf — ${date}

## Reminders

- Smooth tempo
`;
}

export function pluginSettings() {
  return {
    language: "en",
    timezone: E2E_TIMEZONE,
    dashboardPath: "atomics/Dashboard.md",
    golfCuesPath: "atomics/exercise/Golf/Cues.md",
    gymCuesPath: "atomics/exercise/Gym/Cues.md",
    gymLogSetup: "complete",
    gymExercises: [{ exercise: "Squat", muscle: "Quads" }],
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
}

function seedObsidianConfig(vault) {
  const obsidianDir = join(vault, ".obsidian");
  ensureDir(obsidianDir);

  write(
    join(obsidianDir, "app.json"),
    JSON.stringify(
      {
        readableLineLength: false,
        theme: "moonstone",
        accentColor: "",
        baseFontSize: 16,
        livePreview: true,
        propertiesInDocument: "visible",
        promptDelete: false,
        alwaysUpdateLinks: false,
      },
      null,
      2,
    ),
  );

  write(
    join(obsidianDir, "appearance.json"),
    JSON.stringify(
      { theme: "moonstone", accentColor: "", showRibbon: true },
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
        "daily-notes": false,
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
        properties: true,
        bases: true,
      },
      null,
      2,
    ),
  );

  const pluginDir = join(obsidianDir, "plugins/atomic-tracker");
  ensureDir(pluginDir);
  write(join(pluginDir, "data.json"), JSON.stringify(pluginSettings(), null, 2));
}

function deployPlugin(vault, pluginRoot) {
  const pluginDir = join(vault, ".obsidian/plugins/atomic-tracker");
  ensureDir(pluginDir);
  for (const file of ["main.js", "manifest.json", "styles.css"]) {
    const src = join(pluginRoot, file);
    if (!existsSync(src)) throw new Error(`Missing plugin file ${src}`);
    copyFileSync(src, join(pluginDir, file));
  }
}

export function seedE2eVault(options = {}) {
  const vault = options.vaultPath ?? process.env.ATOMIC_E2E_VAULT ?? DEFAULT_E2E_VAULT;
  const pluginRoot = options.pluginRoot ?? ROOT;
  const today = options.today ?? utcToday();
  const year = today.slice(0, 4);
  const deploy = options.deployPlugin !== false;

  assertSafeE2eVaultPath(vault);
  if (existsSync(vault)) rmSync(vault, { recursive: true, force: true });
  ensureDir(vault);
  seedObsidianConfig(vault);
  if (deploy) deployPlugin(vault, pluginRoot);

  write(
    join(vault, E2E_FILES.golfCues),
    `# Golf cues\n\n\`\`\`atomic-golf-cues\nyear: ${year}\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.gymCues),
    `# Gym cues\n\n\`\`\`atomic-gym-cues\nyear: ${year}\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.cues),
    `# Cues\n\n\`\`\`atomic-cues\nactivity: golf\nyear: ${year}\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.heatmapAll),
    `# Heatmap all\n\n\`\`\`atomic-heatmap\nactivity: all\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.heatmapReading),
    `# Heatmap reading\n\n\`\`\`atomic-heatmap\nactivity: reading\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.heatmapGymGolf),
    `# Heatmap gym golf\n\n\`\`\`atomic-heatmap\nactivity: gym, golf\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.bookshelfAll),
    `# Bookshelf all\n\n\`\`\`atomic-bookshelf\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.bookshelfReading),
    `# Bookshelf reading\n\n\`\`\`atomic-bookshelf\nstatus: reading\n\`\`\`\n`,
  );
  write(
    join(vault, E2E_FILES.bookshelfScaled),
    `# Bookshelf scaled\n\n\`\`\`atomic-bookshelf\nscale: 1.5\n\`\`\`\n`,
  );

  write(join(vault, E2E_FILES.golfSession(year, today)), golfSession(today));
  write(join(vault, E2E_FILES.gymSession(year, today)), gymSession(today));
  write(join(vault, "atomics/exercise/Golf/Cues.md"), "# Golf Cues\n");
  write(join(vault, "atomics/exercise/Gym/Cues.md"), "# Gym Cues\n");

  write(
    join(vault, E2E_FILES.readingCurrent),
    readingItem({
      title: "Currently Reading",
      status: "reading",
      totalMin: 25,
      timeLog: `- ${today} | 25 min | seeded`,
    }),
  );
  write(
    join(vault, E2E_FILES.readingFinished),
    readingItem({
      title: "Finished Book",
      status: "finished",
      totalMin: 0,
      timeLog: "",
    }),
  );

  write(
    join(vault, "atomics/Dashboard.md"),
    `---\nyear: ${year}\n---\n\n# Dashboard\n\n\`\`\`atomic-dashboard\nyear: ${year}\n\`\`\`\n`,
  );

  return { vault, today, year };
}

export function registerVaultInObsidianConfig(
  vaultPath,
  vaultId = E2E_VAULT_ID,
) {
  const configPath = join(
    process.env.HOME || "/home/ubuntu",
    ".config/obsidian/obsidian.json",
  );
  ensureDir(dirname(configPath));
  let parsed = { vaults: {} };
  if (existsSync(configPath)) {
    try {
      parsed = JSON.parse(readFileSync(configPath, "utf8"));
    } catch {
      parsed = { vaults: {} };
    }
  }
  if (!parsed.vaults || typeof parsed.vaults !== "object") parsed.vaults = {};
  parsed.vaults[vaultId] = {
    path: vaultPath,
    ts: Date.now(),
    open: true,
  };
  writeFileSync(configPath, JSON.stringify(parsed), "utf8");
  return vaultId;
}
