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
var import_obsidian10 = require("obsidian");

// src/commands/create-session.ts
var import_obsidian2 = require("obsidian");

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
var GOLF_LOCATIONS = ["Home net", "Driving range", "Course", "Other"];
var FELT = ["good", "ok", "bad"];
function isLoadedWeight(weight) {
  if (weight === null || weight === void 0) return false;
  const s = String(weight).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower === "bw" || s === "\u2014" || s === "-" || lower === "n/a") return false;
  return !Number.isNaN(Number(s));
}
function toKg(weight, unit) {
  const n = Number(weight);
  if (Number.isNaN(n)) return 0;
  return unit === "lb" ? n * LB_TO_KG : n;
}
function rowVolumeKg(row, unit = "kg") {
  if (!isLoadedWeight(row.weight)) return 0;
  const reps = Number(row.reps);
  if (!Number.isFinite(reps) || reps <= 0) return 0;
  return toKg(row.weight, unit) * reps;
}
function parseSetTable(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const rows = [];
  let inTable = false;
  let headerSeen = false;
  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      if (inTable && headerSeen) break;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (!cells.length) continue;
    const joined = cells.join(" ").toLowerCase();
    if (!headerSeen) {
      if (joined.includes("exercise") && joined.includes("muscle")) {
        headerSeen = true;
        inTable = true;
      }
      continue;
    }
    if (cells.every((c) => /^:?-{1,}:?$/.test(c))) continue;
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
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < 30) return 1;
  if (n < 60) return 2;
  if (n < 90) return 3;
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
    if (!key) continue;
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
    if (inRem && /^##\s+/.test(line)) break;
    if (inRem) {
      const m = line.match(/^\s*[-*]\s+(.+)$/);
      if (m) out.push(m[1].trim());
    }
  }
  return out;
}

// src/core/reading-status.ts
var READING_STATUSES = [
  "to-read",
  "reading",
  "to-read-again",
  "finished"
];
var DEFAULT_READING_STATUS = "to-read";
var STATUS_ORDER = /* @__PURE__ */ new Map([
  ["reading", 0],
  ["to-read", 1],
  ["to-read-again", 2],
  ["finished", 3]
]);
function statusRank(status) {
  return STATUS_ORDER.get(status) ?? 99;
}
function isReadingItemFrontmatter(frontmatter) {
  if (!frontmatter) return false;
  const type = String(frontmatter.type ?? "").trim();
  const activity = String(frontmatter.activity ?? "").trim();
  return type === "atomic-item" && activity === "reading";
}
function readingStatusLabelKey(status) {
  switch (status) {
    case "to-read":
      return "reading.status.toRead";
    case "reading":
      return "reading.status.reading";
    case "to-read-again":
      return "reading.status.toReadAgain";
    case "finished":
      return "reading.status.finished";
    default:
      return status;
  }
}
var KNOWN_STATUSES = new Map(
  READING_STATUSES.map((status) => [status.toLowerCase(), status])
);
function parseStatusTokens(statusOption) {
  if (statusOption == null) return ["all"];
  return statusOption.split(",").map((token) => token.trim()).filter((token) => token.length > 0);
}
function resolveBookShelfStatuses(statusOption) {
  const tokens = parseStatusTokens(statusOption);
  if (tokens.length === 0 || tokens.some((token) => token.toLowerCase() === "all")) {
    return { statuses: null, invalidStatuses: [] };
  }
  const statuses = [];
  const invalidStatuses = [];
  const seen = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const canonical = KNOWN_STATUSES.get(key);
    if (!canonical) {
      invalidStatuses.push(token);
      continue;
    }
    statuses.push(canonical);
  }
  return {
    statuses: statuses.length > 0 ? statuses : null,
    invalidStatuses
  };
}
function matchesBookShelfStatus(itemStatus, statuses) {
  if (!statuses) return true;
  return statuses.includes(itemStatus);
}

// src/core/property-options.ts
var CUSTOM_LOCATION_SENTINEL = "__atomic_custom_location__";
function resolveGymCreateLocation(selected, customPromptRaw) {
  if (selected !== CUSTOM_LOCATION_SENTINEL) {
    return { location: selected, wasCustom: false, emptyCustomNotice: false };
  }
  if (customPromptRaw === null || customPromptRaw === void 0) {
    return { location: "", wasCustom: false, emptyCustomNotice: false };
  }
  const trimmed = customPromptRaw.trim();
  if (!trimmed) {
    return { location: "", wasCustom: false, emptyCustomNotice: true };
  }
  return { location: trimmed, wasCustom: true, emptyCustomNotice: false };
}
function gymCreateLocationNeedsDetail(location, wasCustom) {
  return location === "Other" && !wasCustom;
}
var WEIGHT_UNITS = ["kg", "lb"];
function sessionActivity(frontmatter) {
  return String(frontmatter?.activity ?? "").trim().toLowerCase();
}
function isSession(frontmatter) {
  return String(frontmatter?.type ?? "").trim() === "session";
}
function isGolfSession(context) {
  return isSession(context.frontmatter) && sessionActivity(context.frontmatter) === "golf";
}
function isGymSession(context) {
  return isSession(context.frontmatter) && sessionActivity(context.frontmatter) === "gym";
}
function gymLocationLabelKey(value) {
  switch (value) {
    case "Home":
      return "location.home";
    case "Commercial":
      return "location.commercial";
    case "Hotel/Travel":
      return "location.hotelTravel";
    case "Other":
      return "location.other";
    default:
      return value;
  }
}
function golfLocationLabelKey(value) {
  switch (value) {
    case "Home net":
      return "property.golfLocation.homeNet";
    case "Driving range":
      return "property.golfLocation.drivingRange";
    case "Course":
      return "property.golfLocation.course";
    case "Other":
      return "property.golfLocation.other";
    default:
      return value;
  }
}
function feltLabelKey(value) {
  switch (value) {
    case "good":
      return "property.felt.good";
    case "ok":
      return "property.felt.ok";
    case "bad":
      return "property.felt.bad";
    default:
      return value;
  }
}
function weightUnitLabelKey(value) {
  switch (value) {
    case "kg":
      return "property.weightUnit.kg";
    case "lb":
      return "property.weightUnit.lb";
    default:
      return value;
  }
}
var PROPERTY_OPTION_SPECS = [
  {
    property: "status",
    values: READING_STATUSES,
    matches: (context) => isReadingItemFrontmatter(context.frontmatter),
    labelKey: readingStatusLabelKey
  },
  {
    property: "felt",
    values: FELT,
    matches: isGolfSession,
    labelKey: feltLabelKey
  },
  {
    property: "location",
    values: GOLF_LOCATIONS,
    matches: isGolfSession,
    labelKey: golfLocationLabelKey,
    allowCustom: true
  },
  {
    property: "location",
    values: GYM_LOCATIONS,
    matches: isGymSession,
    labelKey: gymLocationLabelKey,
    allowCustom: true
  },
  {
    property: "weight_unit",
    values: WEIGHT_UNITS,
    matches: isGymSession,
    labelKey: weightUnitLabelKey
  }
];
var DROPDOWN_PROPERTY_NAMES = [
  ...new Set(PROPERTY_OPTION_SPECS.map((spec) => spec.property))
];
function resolvePropertyOptions(property, context) {
  return PROPERTY_OPTION_SPECS.find(
    (spec) => spec.property === property && spec.matches(context)
  ) ?? null;
}

// src/dates.ts
var utcMonthShortZh = new Intl.DateTimeFormat("zh-HK", {
  month: "short",
  timeZone: "UTC"
});
var utcMonthShortEn = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC"
});
var utcFullDateZh = new Intl.DateTimeFormat("zh-HK", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
var utcFullDateEn = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});
var utcMonthLongEn = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC"
});
var utcMonthLongZh = new Intl.DateTimeFormat("zh-HK", {
  year: "numeric",
  month: "long",
  timeZone: "UTC"
});
var ymdFormatters = /* @__PURE__ */ new Map();
function utcNoon(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function ymdFormatter(timeZone) {
  const cached = ymdFormatters.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  ymdFormatters.set(timeZone, formatter);
  return formatter;
}
function ymdInZone(date, timeZone) {
  return ymdFormatter(timeZone).format(date);
}
function nowYear(timeZone) {
  return Number(ymdInZone(/* @__PURE__ */ new Date(), timeZone).slice(0, 4));
}
function nowMonth(timeZone) {
  return Number(ymdInZone(/* @__PURE__ */ new Date(), timeZone).slice(5, 7));
}
function parseYmd(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
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
  return utcMonthShortZh.format(utcNoon(y, m, d));
}
function monthShortEn(y, m, d) {
  return utcMonthShortEn.format(utcNoon(y, m, d));
}
function monthShortForLanguage(y, m, d, language) {
  return language === "en" ? monthShortEn(y, m, d) : monthShortZh(y, m, d);
}
function fullDateZh(y, m, d) {
  return utcFullDateZh.format(utcNoon(y, m, d));
}
function fullDateEn(y, m, d) {
  return utcFullDateEn.format(utcNoon(y, m, d));
}
function fullDateForLanguage(y, m, d, language) {
  return language === "en" ? fullDateEn(y, m, d) : fullDateZh(y, m, d);
}
function monthLongEn(y, m) {
  return utcMonthLongEn.format(utcNoon(y, m, 1));
}
function monthLongZh(y, m) {
  return utcMonthLongZh.format(utcNoon(y, m, 1));
}
function formatMonthLabel(y, m, language) {
  if (language === "en") return monthLongEn(y, m);
  return `${monthLongEn(y, m)} / ${monthLongZh(y, m)}`;
}
function extractYmdFromPath(path) {
  const m = String(path || "").match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// src/i18n/locales/en.ts
var en = {
  "settings.title": "Atomic Tracker",
  "settings.language": "Language",
  "settings.languageDesc": "Choose the plugin UI language. Existing notes and frontmatter are not rewritten.",
  "settings.languageOption.zh-Hant-en": "Traditional Chinese & English",
  "settings.languageOption.en": "English",
  "settings.timezone": "Timezone",
  "settings.timezoneDesc": "IANA timezone for today and session dates (e.g. Asia/Hong_Kong).",
  "settings.dashboardPath": "Dashboard path",
  "settings.dashboardPathDesc": "Vault-relative path opened by Open dashboard.",
  "settings.exerciseTypes": "Exercise types",
  "settings.exerciseTypesDesc": "Exercise sessions live in each activity folder. New exercise types default under atomics/exercise/<Name>.",
  "settings.addExerciseType": "Add exercise type",
  "settings.addExerciseTypeDesc": "Creates a daily-session exercise with cues enabled and no set table.",
  "settings.add": "Add",
  "settings.activityId": "Activity id: {id}",
  "settings.labelPlaceholder": "Label",
  "settings.exerciseFolderPlaceholder": "atomics/exercise/Name",
  "settings.enableCuesTooltip": "Enable reminder/cue rollups for this exercise",
  "settings.enabledTooltip": "Include this habit in heatmaps, dashboard, and commands",
  "settings.baseColor": "{label} color",
  "settings.baseColorDesc": "Pick one color. Heatmap shades are generated automatically (light to dark).",
  "settings.colors": "{label} colors",
  "settings.colorsDesc": "Heatmap colors from low to high intensity.",
  "settings.exerciseNamePlaceholder": "Running",
  "settings.colorPlaceholder": "#{number}",
  "settings.hobbyTypes": "General habits",
  "settings.hobbyTypesDesc": "Item notes with timers. New habits default under atomics/hobbies/<Name>. Reading is included by default and can be disabled or deleted.",
  "settings.addHobbyType": "Add general habit",
  "settings.addHobbyTypeDesc": "Creates an item hobby with timer tracking and no cues.",
  "settings.hobbyNamePlaceholder": "Chess",
  "settings.hobbyFolderPlaceholder": "atomics/hobbies/Name",
  "settings.delete": "Delete",
  "settings.deleteConfirm": "Remove \u201C{label}\u201D from Atomic Tracker settings? Vault notes are not deleted.",
  "settings.gymExercises": "Gym exercises",
  "settings.gymExercisesDesc": "Saved exercise + muscle pairs for the gym logger.",
  "settings.gymExercisesCount": "{count} saved pairs",
  "settings.gymImport": "Import from gym notes",
  "settings.gymImportDesc": "Scan gym session tables, save unique exercise + muscle pairs, and insert the gym logger into notes that do not have it yet.",
  "command.newGymSession": "New gym session",
  "command.newGolfSession": "New golf session",
  "command.newExerciseSession": "New exercise session",
  "command.newReadingItem": "New reading item",
  "command.newHobbyItem": "New hobby item",
  "command.createReadingBookshelf": "Create reading Bases",
  "command.openReadingBookshelf": "Open reading Bases",
  "command.createBookShelf": "Create book shelf",
  "command.openBookShelf": "Open book shelf",
  "command.openDashboard": "Open dashboard",
  "notice.created": "Created: {path}",
  "notice.reloadForCommands": "Language saved. Reload the plugin or Obsidian to refresh command palette names.",
  "notice.enterExerciseType": "Enter an exercise type name first.",
  "notice.enterHobbyType": "Enter a general habit name first.",
  "notice.activityDeleted": "Removed {label} from settings.",
  "notice.noHobbyActivities": "No enabled general habits configured",
  "notice.folderUnsafe": "Folder must be a safe vault-relative path.",
  "notice.noExerciseActivities": "No exercise activities configured",
  "notice.noGymActivity": "No gym activity configured",
  "notice.noGolfActivity": "No golf activity configured",
  "notice.noReadingHobby": "No Reading hobby configured",
  "notice.dashboardNotFound": "Dashboard not found: {path}",
  "notice.openedExistingSession": "Opened existing {activity} session: {path}",
  "notice.createdSession": "Created {activity} session: {path}",
  "notice.invalidDate": "Invalid date",
  "notice.createdReadingItem": "Created Reading item: {path}",
  "notice.openedExistingReadingItem": "Opened existing Reading item: {path}",
  "notice.readingItemFailed": "Could not create Reading item: {message}",
  "notice.createdHobbyItem": "Created {label} item: {path}",
  "notice.openedExistingHobbyItem": "Opened existing {label} item: {path}",
  "notice.hobbyItemFailed": "Could not create hobby item: {message}",
  "notice.bookShelfFailed": "Could not create book shelf: {message}",
  "notice.createdReadingBookshelf": "Created reading Bases: {path}",
  "notice.updatedReadingBookshelf": "Updated reading Bases: {path}",
  "notice.readingBookshelfExists": "Reading Bases already exists: {path}",
  "notice.readingBookshelfFailed": "Could not create reading Bases: {message}",
  "notice.enableBases": "Enable the Bases core plugin to use reading Bases.",
  "notice.createdBookShelf": "Created book shelf: {path}",
  "notice.bookShelfExists": "Book shelf already exists: {path}",
  "notice.timerNeedsSavedNote": "Timer can only update a saved note.",
  "notice.timerNotRunning": "Timer is not running.",
  "notice.timerAlreadyRunning": "Timer is already running.",
  "notice.timerLogged": "Logged {minutes} min.",
  "notice.emptyCustomLocation": "Location cannot be empty.",
  "notice.gymLogNeedsSavedNote": "Gym logger can only update a saved note.",
  "notice.gymLogMissingFields": "Choose an exercise and enter weight and reps.",
  "notice.gymLogAdded": "Logged {exercise}.",
  "notice.gymLogEmptyExercise": "Exercise name cannot be empty.",
  "notice.gymLogEmptyMuscle": "Muscle cannot be empty.",
  "notice.gymLogSetupComplete": "Gym logger ready: {pairs} exercises, {notes} notes updated.",
  "notice.gymLogSetupLater": "You can import gym exercises later from Settings \u2192 Atomic Tracker.",
  "notice.gymLogSetupFailed": "Gym logger setup failed: {message}",
  "notice.gymExerciseSaved": "Saved {exercise} \xB7 {muscle}.",
  "modal.dateTitle": "Date (YYYY-MM-DD)",
  "modal.cancel": "Cancel",
  "modal.ok": "OK",
  "modal.locationPlaceholder": "Location (Esc to skip)",
  "modal.otherLocationDetail": "Other location detail",
  "modal.customLocation": "Custom location",
  "modal.weightUnitPlaceholder": "Weight unit (Esc -> kg)",
  "modal.exerciseTypePlaceholder": "Exercise type",
  "modal.hobbyTypePlaceholder": "General habit",
  "modal.readingItemTitle": "Reading item title",
  "modal.hobbyItemTitle": "{label} item title",
  "modal.timeLogNote": "Time log note",
  "modal.gymNewExerciseTitle": "New exercise",
  "modal.gymExerciseName": "Exercise",
  "modal.gymMuscle": "Muscle",
  "modal.gymCustomMuscle": "Custom muscle",
  "modal.gymSetupTitle": "Gym logging update",
  "modal.gymSetupBody": "Gym sessions now include an in-note logger. Sets still live in the markdown table. Set up once to import your past exercise + muscle pairs and add the logger to existing gym notes.",
  "modal.gymSetupConfirm": "Set up now",
  "modal.gymSetupLater": "Later",
  "location.home": "Home",
  "location.commercial": "Commercial",
  "location.hotelTravel": "Hotel/Travel",
  "location.other": "Other",
  "template.gymMuscles": "Muscles",
  "template.gymTable.exercise": "Exercise",
  "template.gymTable.muscle": "Muscle",
  "template.gymTable.weight": "Weight",
  "template.gymTable.reps": "Reps",
  "template.gymTable.notes": "Notes",
  "template.reminders": "\u{1F4A1} Reminders",
  "template.golfLocationHint": "\u{1F4CD} location: Home net, Driving range, Course, Other",
  "template.golfFocusHint": "\u{1F3AF} focus (multi): Grip, Stance, Takeaway, Backswing, Transition, Downswing, Impact, Follow-through, Tempo, Alignment",
  "template.golfClubHint": "\u{1F3CC}\uFE0F club (multi): Driver, 3W, 5W, Hybrid, 4i-9i, PW, GW, SW, LW, Putter, Mixed",
  "template.golfFeltHint": "felt: good, ok, bad",
  "template.readingRemarks": "Remarks",
  "template.readingTimeLog": "Time log",
  "template.readingBookshelfTitle": "Reading bookshelf v2",
  "template.base.title": "Title",
  "template.base.authors": "Authors",
  "template.base.description": "Description",
  "template.base.pages": "Pages",
  "template.base.status": "Status",
  "template.base.tags": "Tags",
  "template.base.totalMinutes": "Total minutes",
  "template.base.cards": "Cards",
  "template.base.table": "Table",
  "block.opt.header": "Uncomment a line to use it. Lines that start with # are ignored.",
  "block.opt.yearHeatmap": "calendar year. Omit to use a YYYY-MM-DD note path, or this year",
  "block.opt.activityHeatmap": "all, one id, or comma list (gym, golf). Default: all enabled habits",
  "block.opt.rows": "preferred rows for several heatmaps. Default: 1",
  "block.opt.columns": "max columns; 1 stacks vertically. Default: 1",
  "block.opt.minColumnWidth": "wrap below this column width in px. Default: 300",
  "block.opt.defaultSpan": "relative width of each heatmap column. Default: 1.2",
  "block.opt.dateToday": "YYYY-MM-DD. Omit to use the note path date, or today",
  "block.opt.yearDashboard": "calendar year. Omit to use the note year property, or this year",
  "block.opt.yearCues": "calendar year. Omit to use the note year property, or this year",
  "block.opt.activityCues": "required: golf, gym, or another exercise id",
  "block.opt.activityBookshelf": "habit id (enabled item habit with a timer). Default: reading",
  "block.opt.statusBookshelf": "all, or to-read, reading, to-read-again, finished. Default: all",
  "block.opt.scaleBookshelf": "book size vs default, 0.25\u20134. Default: 1. Alias: ratio",
  "block.opt.noneActions": "No options. One button for each enabled habit.",
  "block.opt.noneTimer": "No options. Start, Stop, Resume, or Discard the timer on this note.",
  "block.opt.noneGymLog": "No options. Pick an exercise, enter weight and reps, then add a set to this note's table.",
  "reading.status.selectLabel": "Reading status",
  "reading.status.toRead": "To read",
  "reading.status.reading": "Reading",
  "reading.status.toReadAgain": "To read again",
  "reading.status.finished": "Finished",
  "property.selectLabel": "Select {property} value",
  "property.felt.good": "Good",
  "property.felt.ok": "OK",
  "property.felt.bad": "Bad",
  "property.golfLocation.homeNet": "Home net",
  "property.golfLocation.drivingRange": "Driving range",
  "property.golfLocation.course": "Course",
  "property.golfLocation.other": "Other",
  "property.location.custom": "Custom\u2026",
  "property.weightUnit.kg": "kg",
  "property.weightUnit.lb": "lb",
  "view.atomicCuesRequiresActivity": "atomic-cues requires an activity option, for example activity: golf.",
  "view.unknownAtomicBlock": "Unknown block: {kind}",
  "view.atomicError": "Error: {message}",
  "view.dashboard.overview": "\u{1F4CA} {year} overview",
  "view.dashboard.cues": "\u{1F4A1} {activity} cues",
  "view.dashboard.sessions": "{activity} sessions: ",
  "view.dashboard.durationSuffix": ", {minutes} min",
  "view.dashboard.totalExerciseDuration": "Total exercise duration: ",
  "view.dashboard.minuteUnit": " min",
  "view.dashboard.totalVolume": "Total set-table volume: ",
  "view.dashboard.golfFelt": "Golf felt - good: {good}, ok: {ok}, bad: {bad}",
  "view.dashboard.hobbies": "Hobbies",
  "view.dashboard.items": "{activity} items: ",
  "view.dashboard.hobbyMinutesSuffix": ", {minutes} min",
  "view.dashboard.readingBookshelf": "Reading bookshelf",
  "view.dashboard.bookShelf": "Book shelf",
  "view.dashboard.monthly": "Monthly",
  "view.dashboard.month": "Month",
  "view.dashboard.sparkSessions": "{activity} sessions ",
  "view.dashboard.sparkVolume": "{activity} volume ",
  "view.dashboard.volumeHeader": "{activity} volume (kg)",
  "view.dashboard.muscles": "Muscles",
  "view.dashboard.muscle": "Muscle",
  "view.dashboard.sets": "Sets",
  "view.dashboard.volumeKg": "Volume (kg)",
  "view.dashboard.noSetData": "No set data",
  "view.dashboard.golfFocus": "Golf focus",
  "view.dashboard.noFocusTags": "No focus tags",
  "view.dashboard.recentSessions": "Recent sessions",
  "view.dashboard.noSessions": "No sessions yet",
  "view.heatmap.less": "Less",
  "view.heatmap.more": "More",
  "view.heatmap.byDuration": "by duration",
  "view.heatmap.minutes": "{minutes} min",
  "view.heatmap.tooltip": "{date}: {minutes} min",
  "view.heatmap.tooltipOpen": "{date}: {minutes} min - click to open",
  "view.heatmap.invalidActivities": "Unknown or disabled heatmap activities: {ids}",
  "view.heatmap.noActivities": "No enabled habits to show in this heatmap.",
  "view.today.title": "\u{1F5C2}\uFE0F Today\u2019s sessions",
  "view.today.noSession": "no session yet",
  "view.cues.noCueActivity": "No cue-enabled {activity} exercise activity configured.",
  "view.cues.thisMonth": "\u{1F4C5} This month - {month}",
  "view.cues.noReminders": "No reminders this month",
  "view.cues.keepers": "\u2B50 Keepers (>=2 in {year})",
  "view.cues.noKeepers": "No keepers yet",
  "view.cues.lastSeen": " (x{count}, last {lastSeen}{focus})",
  "view.bookShelf.open": "Open {title}",
  "view.bookShelf.noActivity": "No timer-backed hobby activity configured for {activity}.",
  "view.bookShelf.empty": "No Reading items yet. Run New reading item.",
  "view.bookShelf.emptyFiltered": "No Reading items with status: {statuses}.",
  "view.bookShelf.invalidStatuses": "Unknown book shelf status values: {statuses}",
  "view.timer.needsReadingItem": "Timer can only run from a saved Reading item note.",
  "view.timer.total": "Total: {minutes} min",
  "view.timer.runningSince": "Timer running since {time}",
  "view.timer.stop": "Stop",
  "view.timer.resume": "Resume",
  "view.timer.discard": "Discard",
  "view.timer.start": "Start",
  "view.gymLog.needsSession": "Gym logger can only run from a saved gym session note.",
  "view.gymLog.exercise": "Exercise",
  "view.gymLog.weight": "Weight",
  "view.gymLog.reps": "Reps",
  "view.gymLog.notes": "Notes",
  "view.gymLog.add": "Add set",
  "view.gymLog.newExercise": "New exercise\u2026",
  "view.gymLog.emptyCatalog": "No saved exercises yet. Choose New exercise\u2026 to add one.",
  "view.gymLog.customMuscle": "Custom\u2026",
  "muscle.Chest": "Chest",
  "muscle.Back": "Back",
  "muscle.Shoulders": "Shoulders",
  "muscle.Biceps": "Biceps",
  "muscle.Triceps": "Triceps",
  "muscle.Quads": "Quads",
  "muscle.Hamstrings": "Hamstrings",
  "muscle.Glutes": "Glutes",
  "muscle.Calves": "Calves",
  "muscle.Core": "Core"
};

// src/i18n/locales/zh-Hant-en.ts
var zhHantEn = {
  "settings.title": "Atomic Tracker",
  "settings.language": "Language / \u8A9E\u8A00",
  "settings.languageDesc": "Choose plugin UI language / \u9078\u64C7\u5916\u639B\u4ECB\u9762\u8A9E\u8A00\u3002Existing notes are not rewritten / \u4E0D\u6703\u6539\u5BEB\u73FE\u6709\u7B46\u8A18\u3002",
  "settings.languageOption.zh-Hant-en": "Traditional Chinese & English / \u7E41\u9AD4\u4E2D\u6587\uFF0B\u82F1\u6587",
  "settings.languageOption.en": "English / \u82F1\u6587",
  "settings.timezone": "Timezone / \u6642\u5340",
  "settings.timezoneDesc": "IANA timezone for today and session dates / \u7528\u65BC\u300C\u4ECA\u65E5\u300D\u548C\u8A13\u7DF4\u65E5\u671F\u7684 IANA \u6642\u5340 (e.g. Asia/Hong_Kong)\u3002",
  "settings.dashboardPath": "Dashboard path / \u5100\u8868\u677F\u8DEF\u5F91",
  "settings.dashboardPathDesc": "Vault-relative path opened by Open dashboard / Open dashboard \u6703\u958B\u555F\u7684 vault \u76F8\u5C0D\u8DEF\u5F91\u3002",
  "settings.exerciseTypes": "Exercise types / \u904B\u52D5\u985E\u578B",
  "settings.exerciseTypesDesc": "Exercise sessions live in each activity folder. New exercise types default under atomics/exercise/<Name> / \u8A13\u7DF4\u7B46\u8A18\u5B58\u65BC\u5404\u6D3B\u52D5\u8CC7\u6599\u593E\uFF0C\u65B0\u904B\u52D5\u985E\u578B\u9810\u8A2D\u653E\u5728 atomics/exercise/<Name>\u3002",
  "settings.addExerciseType": "Add exercise type / \u65B0\u589E\u904B\u52D5\u985E\u578B",
  "settings.addExerciseTypeDesc": "Creates a daily-session exercise with cues enabled and no set table / \u5EFA\u7ACB\u6BCF\u65E5\u8A13\u7DF4\u985E\u578B\uFF0C\u555F\u7528\u63D0\u9192\uFF0C\u4E0D\u555F\u7528\u7D44\u6578\u8868\u3002",
  "settings.add": "Add / \u65B0\u589E",
  "settings.activityId": "Activity id / \u6D3B\u52D5 ID: {id}",
  "settings.labelPlaceholder": "Label / \u6A19\u7C64",
  "settings.exerciseFolderPlaceholder": "atomics/exercise/Name",
  "settings.enableCuesTooltip": "Enable reminder/cue rollups for this exercise / \u555F\u7528\u6B64\u904B\u52D5\u7684\u63D0\u9192\u5F59\u6574",
  "settings.enabledTooltip": "Include this habit in heatmaps, dashboard, and commands / \u5728 Heatmap\u3001\u5100\u8868\u677F\u8207\u547D\u4EE4\u4E2D\u5305\u542B\u6B64\u7FD2\u6163",
  "settings.baseColor": "{label} color / \u984F\u8272",
  "settings.baseColorDesc": "Pick one color. Heatmap shades are generated automatically (light to dark) / \u9078\u64C7\u4E00\u7A2E\u984F\u8272\uFF0CHeatmap \u6DF1\u6DFA\u8272\u968E\u6703\u81EA\u52D5\u7522\u751F\uFF08\u7531\u6DFA\u81F3\u6DF1\uFF09\u3002",
  "settings.colors": "{label} colors / \u984F\u8272",
  "settings.colorsDesc": "Heatmap colors from low to high intensity / Heatmap \u984F\u8272\uFF0C\u7531\u4F4E\u81F3\u9AD8\u5F37\u5EA6\u3002",
  "settings.exerciseNamePlaceholder": "Running / \u8DD1\u6B65",
  "settings.colorPlaceholder": "#{number}",
  "settings.hobbyTypes": "General habits / \u4E00\u822C\u7FD2\u6163",
  "settings.hobbyTypesDesc": "Item notes with timers. New habits default under atomics/hobbies/<Name>. Reading is included by default and can be disabled or deleted / \u542B\u8A08\u6642\u5668\u7684\u9805\u76EE\u7B46\u8A18\u3002\u65B0\u7FD2\u6163\u9810\u8A2D\u653E\u5728 atomics/hobbies/<Name>\u3002\u95B1\u8B80\u70BA\u9810\u8A2D\u9805\u76EE\uFF0C\u53EF\u505C\u7528\u6216\u522A\u9664\u3002",
  "settings.addHobbyType": "Add general habit / \u65B0\u589E\u4E00\u822C\u7FD2\u6163",
  "settings.addHobbyTypeDesc": "Creates an item hobby with timer tracking and no cues / \u5EFA\u7ACB\u542B\u8A08\u6642\u5668\u3001\u4E0D\u542B\u63D0\u9192\u7684\u8208\u8DA3\u9805\u76EE\u985E\u578B\u3002",
  "settings.hobbyNamePlaceholder": "Chess / \u4E0B\u68CB",
  "settings.hobbyFolderPlaceholder": "atomics/hobbies/Name",
  "settings.delete": "Delete / \u522A\u9664",
  "settings.deleteConfirm": "Remove \u201C{label}\u201D from Atomic Tracker settings? Vault notes are not deleted / \u8981\u5F9E Atomic Tracker \u8A2D\u5B9A\u79FB\u9664\u300C{label}\u300D\u55CE\uFF1F\u4E0D\u6703\u522A\u9664 vault \u7B46\u8A18\u3002",
  "settings.gymExercises": "Gym exercises / \u5065\u8EAB\u52D5\u4F5C",
  "settings.gymExercisesDesc": "Saved exercise + muscle pairs for the gym logger / \u5065\u8EAB\u8A18\u9304\u5668\u7528\u7684\u52D5\u4F5C\uFF0B\u808C\u7FA4\u914D\u5C0D\u3002",
  "settings.gymExercisesCount": "{count} saved pairs / \u5DF2\u5132\u5B58 {count} \u7D44",
  "settings.gymImport": "Import from gym notes / \u5F9E\u5065\u8EAB\u7B46\u8A18\u532F\u5165",
  "settings.gymImportDesc": "Scan gym session tables, save unique exercise + muscle pairs, and insert the gym logger into notes that do not have it yet / \u6383\u63CF\u5065\u8EAB\u7B46\u8A18\u8868\u683C\uFF0C\u5132\u5B58\u52D5\u4F5C\uFF0B\u808C\u7FA4\u914D\u5C0D\uFF0C\u4E26\u70BA\u5C1A\u672A\u6709\u8A18\u9304\u5668\u7684\u7B46\u8A18\u52A0\u5165\u8A18\u9304\u5668\u3002",
  "command.newGymSession": "New gym session / \u65B0\u589E\u5065\u8EAB\u8A13\u7DF4",
  "command.newGolfSession": "New golf session / \u65B0\u589E\u9AD8\u723E\u592B\u8A13\u7DF4",
  "command.newExerciseSession": "New exercise session / \u65B0\u589E\u904B\u52D5\u8A13\u7DF4",
  "command.newReadingItem": "New reading item / \u65B0\u589E\u95B1\u8B80\u9805\u76EE",
  "command.newHobbyItem": "New hobby item / \u65B0\u589E\u8208\u8DA3\u9805\u76EE",
  "command.createReadingBookshelf": "Create reading Bases / \u5EFA\u7ACB\u95B1\u8B80 Bases",
  "command.openReadingBookshelf": "Open reading Bases / \u958B\u555F\u95B1\u8B80 Bases",
  "command.createBookShelf": "Create book shelf / \u5EFA\u7ACB\u66F8\u67B6",
  "command.openBookShelf": "Open book shelf / \u958B\u555F\u66F8\u67B6",
  "command.openDashboard": "Open dashboard / \u958B\u555F\u5100\u8868\u677F",
  "notice.created": "Created / \u5DF2\u5EFA\u7ACB: {path}",
  "notice.reloadForCommands": "Language saved. Reload the plugin or Obsidian to refresh command palette names / \u8A9E\u8A00\u5DF2\u5132\u5B58\u3002\u8ACB\u91CD\u65B0\u8F09\u5165\u5916\u639B\u6216 Obsidian \u4EE5\u66F4\u65B0\u547D\u4EE4\u540D\u7A31\u3002",
  "notice.enterExerciseType": "Enter an exercise type name first / \u8ACB\u5148\u8F38\u5165\u904B\u52D5\u985E\u578B\u540D\u7A31\u3002",
  "notice.enterHobbyType": "Enter a general habit name first / \u8ACB\u5148\u8F38\u5165\u4E00\u822C\u7FD2\u6163\u540D\u7A31\u3002",
  "notice.activityDeleted": "Removed {label} from settings / \u5DF2\u5F9E\u8A2D\u5B9A\u79FB\u9664 {label}\u3002",
  "notice.noHobbyActivities": "No enabled general habits configured / \u5C1A\u672A\u8A2D\u5B9A\u5DF2\u555F\u7528\u7684\u4E00\u822C\u7FD2\u6163",
  "notice.folderUnsafe": "Folder must be a safe vault-relative path / \u8CC7\u6599\u593E\u5FC5\u9808\u662F\u5B89\u5168\u7684 vault \u76F8\u5C0D\u8DEF\u5F91\u3002",
  "notice.noExerciseActivities": "No exercise activities configured / \u5C1A\u672A\u8A2D\u5B9A\u904B\u52D5\u6D3B\u52D5",
  "notice.noGymActivity": "No gym activity configured / \u5C1A\u672A\u8A2D\u5B9A\u5065\u8EAB\u6D3B\u52D5",
  "notice.noGolfActivity": "No golf activity configured / \u5C1A\u672A\u8A2D\u5B9A\u9AD8\u723E\u592B\u6D3B\u52D5",
  "notice.noReadingHobby": "No Reading hobby configured / \u5C1A\u672A\u8A2D\u5B9A\u7747\u66F8\u8208\u8DA3",
  "notice.dashboardNotFound": "Dashboard not found / \u627E\u4E0D\u5230\u5100\u8868\u677F: {path}",
  "notice.openedExistingSession": "Opened existing {activity} session / \u5DF2\u958B\u555F\u73FE\u6709 {activity} \u8A13\u7DF4: {path}",
  "notice.createdSession": "Created {activity} session / \u5DF2\u5EFA\u7ACB {activity} \u8A13\u7DF4: {path}",
  "notice.invalidDate": "Invalid date / \u65E5\u671F\u7121\u6548",
  "notice.createdReadingItem": "Created Reading item / \u5DF2\u5EFA\u7ACB\u95B1\u8B80\u9805\u76EE: {path}",
  "notice.openedExistingReadingItem": "Opened existing Reading item / \u5DF2\u958B\u555F\u73FE\u6709\u95B1\u8B80\u9805\u76EE: {path}",
  "notice.readingItemFailed": "Could not create Reading item / \u7121\u6CD5\u5EFA\u7ACB\u95B1\u8B80\u9805\u76EE: {message}",
  "notice.createdHobbyItem": "Created {label} item / \u5DF2\u5EFA\u7ACB {label} \u9805\u76EE: {path}",
  "notice.openedExistingHobbyItem": "Opened existing {label} item / \u5DF2\u958B\u555F\u73FE\u6709 {label} \u9805\u76EE: {path}",
  "notice.hobbyItemFailed": "Could not create hobby item / \u7121\u6CD5\u5EFA\u7ACB\u8208\u8DA3\u9805\u76EE: {message}",
  "notice.bookShelfFailed": "Could not create book shelf / \u7121\u6CD5\u5EFA\u7ACB\u66F8\u67B6: {message}",
  "notice.createdReadingBookshelf": "Created reading Bases / \u5DF2\u5EFA\u7ACB\u95B1\u8B80 Bases: {path}",
  "notice.updatedReadingBookshelf": "Updated reading Bases / \u5DF2\u66F4\u65B0\u95B1\u8B80 Bases: {path}",
  "notice.readingBookshelfExists": "Reading Bases already exists / \u95B1\u8B80 Bases \u5DF2\u5B58\u5728: {path}",
  "notice.readingBookshelfFailed": "Could not create reading Bases / \u7121\u6CD5\u5EFA\u7ACB\u95B1\u8B80 Bases: {message}",
  "notice.enableBases": "Enable the Bases core plugin to use reading Bases / \u8ACB\u555F\u7528 Bases \u6838\u5FC3\u5916\u639B\u4EE5\u4F7F\u7528\u95B1\u8B80 Bases\u3002",
  "notice.createdBookShelf": "Created book shelf / \u5DF2\u5EFA\u7ACB\u66F8\u67B6: {path}",
  "notice.bookShelfExists": "Book shelf already exists / \u66F8\u67B6\u5DF2\u5B58\u5728: {path}",
  "notice.timerNeedsSavedNote": "Timer can only update a saved note / Timer \u53EA\u53EF\u66F4\u65B0\u5DF2\u5132\u5B58\u7684\u7B46\u8A18\u3002",
  "notice.timerNotRunning": "Timer is not running / Timer \u5C1A\u672A\u958B\u59CB\u3002",
  "notice.timerAlreadyRunning": "Timer is already running / Timer \u5DF2\u5728\u904B\u884C\u3002",
  "notice.timerLogged": "Logged {minutes} min / \u5DF2\u8A18\u9304 {minutes} \u5206\u9418\u3002",
  "notice.emptyCustomLocation": "Location cannot be empty. / \u5730\u9EDE\u4E0D\u53EF\u70BA\u7A7A\u767D\u3002",
  "notice.gymLogNeedsSavedNote": "Gym logger can only update a saved note / \u5065\u8EAB\u8A18\u9304\u5668\u53EA\u53EF\u66F4\u65B0\u5DF2\u5132\u5B58\u7684\u7B46\u8A18\u3002",
  "notice.gymLogMissingFields": "Choose an exercise and enter weight and reps / \u8ACB\u9078\u64C7\u52D5\u4F5C\u4E26\u586B\u5BEB\u91CD\u91CF\u8207\u6B21\u6578\u3002",
  "notice.gymLogAdded": "Logged {exercise} / \u5DF2\u8A18\u9304 {exercise}\u3002",
  "notice.gymLogEmptyExercise": "Exercise name cannot be empty / \u52D5\u4F5C\u540D\u7A31\u4E0D\u53EF\u70BA\u7A7A\u767D\u3002",
  "notice.gymLogEmptyMuscle": "Muscle cannot be empty / \u808C\u7FA4\u4E0D\u53EF\u70BA\u7A7A\u767D\u3002",
  "notice.gymLogSetupComplete": "Gym logger ready: {pairs} exercises, {notes} notes updated / \u5065\u8EAB\u8A18\u9304\u5668\u5DF2\u5C31\u7DD2\uFF1A{pairs} \u500B\u52D5\u4F5C\uFF0C\u66F4\u65B0 {notes} \u5247\u7B46\u8A18\u3002",
  "notice.gymLogSetupLater": "You can import gym exercises later from Settings \u2192 Atomic Tracker / \u53EF\u7A0D\u5F8C\u5728 Settings \u2192 Atomic Tracker \u532F\u5165\u5065\u8EAB\u52D5\u4F5C\u3002",
  "notice.gymLogSetupFailed": "Gym logger setup failed / \u5065\u8EAB\u8A18\u9304\u5668\u8A2D\u5B9A\u5931\u6557: {message}",
  "notice.gymExerciseSaved": "Saved {exercise} \xB7 {muscle} / \u5DF2\u5132\u5B58 {exercise} \xB7 {muscle}\u3002",
  "modal.dateTitle": "Date / \u65E5\u671F (YYYY-MM-DD)",
  "modal.cancel": "Cancel / \u53D6\u6D88",
  "modal.ok": "OK",
  "modal.locationPlaceholder": "Location / \u5730\u9EDE (Esc to skip / \u7565\u904E)",
  "modal.otherLocationDetail": "Other location detail / \u5176\u4ED6\u5730\u9EDE\u8AAA\u660E",
  "modal.customLocation": "Custom location / \u81EA\u8A02\u5730\u9EDE",
  "modal.weightUnitPlaceholder": "Weight unit / \u91CD\u91CF\u55AE\u4F4D (Esc -> kg)",
  "modal.exerciseTypePlaceholder": "Exercise type / \u904B\u52D5\u985E\u578B",
  "modal.hobbyTypePlaceholder": "General habit / \u4E00\u822C\u7FD2\u6163",
  "modal.readingItemTitle": "Reading item title / \u95B1\u8B80\u9805\u76EE\u6A19\u984C",
  "modal.hobbyItemTitle": "{label} item title / {label} \u9805\u76EE\u6A19\u984C",
  "modal.timeLogNote": "Time log note / \u6642\u9593\u8A18\u9304\u5099\u8A3B",
  "modal.gymNewExerciseTitle": "New exercise / \u65B0\u589E\u52D5\u4F5C",
  "modal.gymExerciseName": "Exercise / \u52D5\u4F5C",
  "modal.gymMuscle": "Muscle / \u808C\u7FA4",
  "modal.gymCustomMuscle": "Custom muscle / \u81EA\u8A02\u808C\u7FA4",
  "modal.gymSetupTitle": "Gym logging update / \u5065\u8EAB\u8A18\u9304\u66F4\u65B0",
  "modal.gymSetupBody": "Gym sessions now include an in-note logger. Sets still live in the markdown table. Set up once to import your past exercise + muscle pairs and add the logger to existing gym notes / \u5065\u8EAB\u7B46\u8A18\u73FE\u5728\u6709\u5167\u5D4C\u8A18\u9304\u5668\uFF0C\u7D44\u6578\u4ECD\u5BEB\u5165 markdown \u8868\u683C\u3002\u4E00\u6B21\u8A2D\u5B9A\u5373\u53EF\u532F\u5165\u904E\u5F80\u52D5\u4F5C\uFF0B\u808C\u7FA4\uFF0C\u4E26\u70BA\u73FE\u6709\u5065\u8EAB\u7B46\u8A18\u52A0\u5165\u8A18\u9304\u5668\u3002",
  "modal.gymSetupConfirm": "Set up now / \u7ACB\u5373\u8A2D\u5B9A",
  "modal.gymSetupLater": "Later / \u7A0D\u5F8C",
  "location.home": "Home / \u5BB6\u4E2D",
  "location.commercial": "Commercial / \u5546\u696D\u5065\u8EAB\u623F",
  "location.hotelTravel": "Hotel/Travel / \u9152\u5E97\uFF0F\u65C5\u9014",
  "location.other": "Other / \u5176\u4ED6",
  "template.gymMuscles": "Muscles / \u808C\u7FA4",
  "template.gymTable.exercise": "\u{1F4AA} Exercise / \u52D5\u4F5C",
  "template.gymTable.muscle": "\u{1F9EC} Muscle / \u808C\u7FA4",
  "template.gymTable.weight": "\u2696\uFE0F Weight / \u91CD\u91CF",
  "template.gymTable.reps": "\u{1F522} Reps / \u6B21\u6578",
  "template.gymTable.notes": "\u{1F5D2}\uFE0F Notes / \u5099\u8A3B",
  "template.reminders": "\u{1F4A1} Reminders / \u63D0\u9192",
  "template.golfLocationHint": "\u{1F4CD} location / \u5730\u9EDE: Home net / \u5BB6\u7528\u7DB2, Driving range / \u7DF4\u7FD2\u5834, Course / \u7403\u5834, Other / \u5176\u4ED6",
  "template.golfFocusHint": "\u{1F3AF} focus / \u91CD\u9EDE (multi): Grip / \u63E1\u687F, Stance / \u7AD9\u59FF, Takeaway / \u8D77\u687F, Backswing / \u4E0A\u687F, Transition / \u8F49\u63DB, Downswing / \u4E0B\u687F, Impact / \u64CA\u7403, Follow-through / \u9001\u687F, Tempo / \u7BC0\u594F, Alignment / \u7784\u6E96\u7DDA",
  "template.golfClubHint": "\u{1F3CC}\uFE0F club / \u7403\u687F (multi): Driver / \u4E00\u865F\u6728, 3W / \u4E09\u865F\u6728, 5W / \u4E94\u865F\u6728, Hybrid / \u6DF7\u8840\u687F, 4i-9i / \u9435\u687F, PW / \u5288\u8D77\u687F, GW / \u7F3A\u53E3\u687F, SW / \u6C99\u5751\u687F, LW / \u9AD8\u540A\u687F, Putter / \u63A8\u687F, Mixed / \u6DF7\u5408",
  "template.golfFeltHint": "felt / \u611F\u89BA: good / \u597D, ok / \u4E00\u822C, bad / \u5DEE",
  "template.readingRemarks": "Remarks / \u5099\u8A3B",
  "template.readingTimeLog": "Time log / \u6642\u9593\u8A18\u9304",
  "template.readingBookshelfTitle": "Reading bookshelf v2",
  "template.base.title": "Title / \u66F8\u540D",
  "template.base.authors": "Authors / \u4F5C\u8005",
  "template.base.description": "Description / \u63CF\u8FF0",
  "template.base.pages": "Pages / \u9801\u6578",
  "template.base.status": "Status / \u72C0\u614B",
  "template.base.tags": "Tags / \u6A19\u7C64",
  "template.base.totalMinutes": "Total minutes / \u7E3D\u5206\u9418",
  "template.base.cards": "Cards / \u5361\u7247",
  "template.base.table": "Table / \u8868\u683C",
  "block.opt.header": "Uncomment a line to use it. Lines that start with # are ignored. / \u53D6\u6D88\u8A3B\u89E3\u5373\u53EF\u4F7F\u7528\u3002\u4EE5 # \u958B\u982D\u7684\u884C\u6703\u88AB\u5FFD\u7565\u3002",
  "block.opt.yearHeatmap": "calendar year. Omit to use a YYYY-MM-DD note path, or this year / \u897F\u5143\u5E74\u3002\u7701\u7565\u5247\u7528\u8DEF\u5F91\u4E2D\u7684\u65E5\u671F\uFF0C\u5426\u5247\u7528\u4ECA\u5E74",
  "block.opt.activityHeatmap": "all, one id, or comma list (gym, golf). Default: all enabled habits / \u5168\u90E8\u3001\u55AE\u4E00 id\uFF0C\u6216\u9017\u865F\u6E05\u55AE\u3002\u9810\u8A2D\uFF1A\u5168\u90E8\u5DF2\u555F\u7528\u7FD2\u6163",
  "block.opt.rows": "preferred rows for several heatmaps. Default: 1 / \u591A\u500B heatmap \u7684\u5217\u6578\u3002\u9810\u8A2D\uFF1A1",
  "block.opt.columns": "max columns; 1 stacks vertically. Default: 1 / \u6B04\u6578\u4E0A\u9650\uFF1B1 \u70BA\u76F4\u5411\u5806\u758A\u3002\u9810\u8A2D\uFF1A1",
  "block.opt.minColumnWidth": "wrap below this column width in px. Default: 300 / \u4F4E\u65BC\u6B64\u6B04\u5BEC\uFF08px\uFF09\u6703\u63DB\u884C\u3002\u9810\u8A2D\uFF1A300",
  "block.opt.defaultSpan": "relative width of each heatmap column. Default: 1.2 / \u6BCF\u500B heatmap \u6B04\u7684\u76F8\u5C0D\u5BEC\u5EA6\u3002\u9810\u8A2D\uFF1A1.2",
  "block.opt.dateToday": "YYYY-MM-DD. Omit to use the note path date, or today / \u65E5\u671F\u3002\u7701\u7565\u5247\u7528\u8DEF\u5F91\u4E2D\u7684\u65E5\u671F\uFF0C\u5426\u5247\u7528\u4ECA\u5929",
  "block.opt.yearDashboard": "calendar year. Omit to use the note year property, or this year / \u897F\u5143\u5E74\u3002\u7701\u7565\u5247\u7528\u7B46\u8A18 year \u5C6C\u6027\uFF0C\u5426\u5247\u7528\u4ECA\u5E74",
  "block.opt.yearCues": "calendar year. Omit to use the note year property, or this year / \u897F\u5143\u5E74\u3002\u7701\u7565\u5247\u7528\u7B46\u8A18 year \u5C6C\u6027\uFF0C\u5426\u5247\u7528\u4ECA\u5E74",
  "block.opt.activityCues": "required: golf, gym, or another exercise id / \u5FC5\u586B\uFF1Agolf\u3001gym \u6216\u5176\u4ED6\u904B\u52D5 id",
  "block.opt.activityBookshelf": "habit id (enabled item habit with a timer). Default: reading / \u7FD2\u6163 id\uFF08\u9700\u5DF2\u555F\u7528\u3001\u9805\u76EE\u7B46\u8A18\u8207 timer\uFF09\u3002\u9810\u8A2D\uFF1Areading",
  "block.opt.statusBookshelf": "all, or to-read, reading, to-read-again, finished. Default: all / \u5168\u90E8\uFF0C\u6216 to-read\u3001reading\u3001to-read-again\u3001finished\u3002\u9810\u8A2D\uFF1Aall",
  "block.opt.scaleBookshelf": "book size vs default, 0.25\u20134. Default: 1. Alias: ratio / \u76F8\u5C0D\u9810\u8A2D\u5C3A\u5BF8\uFF0C0.25\u20134\u3002\u9810\u8A2D\uFF1A1\u3002\u5225\u540D\uFF1Aratio",
  "block.opt.noneActions": "No options. One button for each enabled habit. / \u7121\u9078\u9805\u3002\u6BCF\u500B\u5DF2\u555F\u7528\u7FD2\u6163\u4E00\u500B\u6309\u9215\u3002",
  "block.opt.noneTimer": "No options. Start, Stop, Resume, or Discard the timer on this note. / \u7121\u9078\u9805\u3002\u5728\u6B64\u7B46\u8A18\u958B\u59CB\u3001\u505C\u6B62\u3001\u7E7C\u7E8C\u6216\u653E\u68C4\u8A08\u6642\u3002",
  "block.opt.noneGymLog": "No options. Pick an exercise, enter weight and reps, then add a set to this note's table. / \u7121\u9078\u9805\u3002\u9078\u64C7\u52D5\u4F5C\u3001\u586B\u5BEB\u91CD\u91CF\u8207\u6B21\u6578\uFF0C\u518D\u5C07\u4E00\u7D44\u52A0\u5165\u6B64\u7B46\u8A18\u8868\u683C\u3002",
  "reading.status.selectLabel": "Reading status / \u95B1\u8B80\u72C0\u614B",
  "reading.status.toRead": "To read / \u5F85\u8B80",
  "reading.status.reading": "Reading / \u95B1\u8B80\u4E2D",
  "reading.status.toReadAgain": "To read again / \u91CD\u8B80",
  "reading.status.finished": "Finished / \u8B80\u5B8C",
  "property.selectLabel": "Select {property} value / \u9078\u64C7 {property} \u503C",
  "property.felt.good": "Good / \u597D",
  "property.felt.ok": "OK / \u4E00\u822C",
  "property.felt.bad": "Bad / \u5DEE",
  "property.golfLocation.homeNet": "Home net / \u5BB6\u7528\u7DB2",
  "property.golfLocation.drivingRange": "Driving range / \u7DF4\u7FD2\u5834",
  "property.golfLocation.course": "Course / \u7403\u5834",
  "property.golfLocation.other": "Other / \u5176\u4ED6",
  "property.location.custom": "Custom\u2026 / \u81EA\u8A02\u2026",
  "property.weightUnit.kg": "kg",
  "property.weightUnit.lb": "lb",
  "view.atomicCuesRequiresActivity": "atomic-cues requires an activity option, for example activity: golf / atomic-cues \u9700\u8981 activity \u9078\u9805\uFF0C\u4F8B\u5982 activity: golf\u3002",
  "view.unknownAtomicBlock": "Unknown block / \u672A\u77E5\u5340\u584A: {kind}",
  "view.atomicError": "Error / \u932F\u8AA4: {message}",
  "view.dashboard.overview": "\u{1F4CA} {year} overview / \u7E3D\u89BD",
  "view.dashboard.cues": "\u{1F4A1} {activity} cues / \u63D0\u9192\u5F59\u6574",
  "view.dashboard.sessions": "{activity} sessions / \u6B21\u6578: ",
  "view.dashboard.durationSuffix": ", {minutes} min / \u5206\u9418",
  "view.dashboard.totalExerciseDuration": "Total exercise duration / \u904B\u52D5\u7E3D\u6642\u9577: ",
  "view.dashboard.minuteUnit": " min / \u5206\u9418",
  "view.dashboard.totalVolume": "Total set-table volume / \u7E3D\u8A13\u7DF4\u91CF: ",
  "view.dashboard.golfFelt": "Golf felt / \u9AD8\u723E\u592B\u611F\u89BA - good / \u597D: {good}, ok / \u4E00\u822C: {ok}, bad / \u5DEE: {bad}",
  "view.dashboard.hobbies": "Hobbies / \u8208\u8DA3",
  "view.dashboard.items": "{activity} items / \u9805\u76EE: ",
  "view.dashboard.hobbyMinutesSuffix": ", {minutes} min / \u5206\u9418",
  "view.dashboard.readingBookshelf": "Reading bookshelf",
  "view.dashboard.bookShelf": "Book shelf / \u66F8\u67B6",
  "view.dashboard.monthly": "Monthly / \u6BCF\u6708",
  "view.dashboard.month": "Month / \u6708",
  "view.dashboard.sparkSessions": "{activity} sessions / \u6B21\u6578 ",
  "view.dashboard.sparkVolume": "{activity} volume / \u8A13\u7DF4\u91CF ",
  "view.dashboard.volumeHeader": "{activity} volume / \u8A13\u7DF4\u91CF (kg)",
  "view.dashboard.muscles": "Muscles / \u808C\u7FA4",
  "view.dashboard.muscle": "Muscle / \u808C\u7FA4",
  "view.dashboard.sets": "Sets / \u7D44\u6578",
  "view.dashboard.volumeKg": "Volume / \u8A13\u7DF4\u91CF (kg)",
  "view.dashboard.noSetData": "No set data / \u5C1A\u7121\u7D44\u6578\u8CC7\u6599",
  "view.dashboard.golfFocus": "Golf focus / \u9AD8\u723E\u592B\u91CD\u9EDE",
  "view.dashboard.noFocusTags": "No focus tags / \u5C1A\u7121\u91CD\u9EDE\u6A19\u7C64",
  "view.dashboard.recentSessions": "Recent sessions / \u6700\u8FD1\u8A13\u7DF4",
  "view.dashboard.noSessions": "No sessions yet / \u5C1A\u672A\u8A18\u9304",
  "view.heatmap.less": "Less / \u5C11",
  "view.heatmap.more": "More / \u591A",
  "view.heatmap.byDuration": "by duration / \u6309\u6642\u9577",
  "view.heatmap.minutes": "{minutes} min / \u5206\u9418",
  "view.heatmap.tooltip": "{date}: {minutes} min / \u5206\u9418",
  "view.heatmap.tooltipOpen": "{date}: {minutes} min / \u5206\u9418 - click to open / \u9EDE\u64CA\u958B\u555F",
  "view.heatmap.invalidActivities": "Unknown or disabled heatmap activities / \u672A\u77E5\u6216\u5DF2\u505C\u7528\u7684 Heatmap \u6D3B\u52D5: {ids}",
  "view.heatmap.noActivities": "No enabled habits to show in this heatmap / \u6C92\u6709\u53EF\u986F\u793A\u7684\u5DF2\u555F\u7528\u7FD2\u6163\u3002",
  "view.today.title": "\u{1F5C2}\uFE0F Today\u2019s sessions / \u4ECA\u65E5\u8A13\u7DF4",
  "view.today.noSession": "no session yet / \u5C1A\u672A\u8A18\u9304",
  "view.cues.noCueActivity": "No cue-enabled {activity} exercise activity configured / \u5C1A\u672A\u8A2D\u5B9A\u652F\u63F4\u63D0\u9192\u7684 {activity} \u904B\u52D5\u6D3B\u52D5\u3002",
  "view.cues.thisMonth": "\u{1F4C5} This month / \u672C\u6708 - {month}",
  "view.cues.noReminders": "No reminders this month / \u672C\u6708\u5C1A\u7121\u63D0\u9192",
  "view.cues.keepers": "\u2B50 Keepers / \u5E38\u99D0\u63D0\u9192 (>=2 in {year})",
  "view.cues.noKeepers": "No keepers yet / \u5C1A\u7121\u5E38\u99D0\u63D0\u9192",
  "view.cues.lastSeen": " (x{count}, last / \u6700\u8FD1 {lastSeen}{focus})",
  "view.bookShelf.open": "Open {title} / \u958B\u555F {title}",
  "view.bookShelf.noActivity": "No timer-backed hobby activity configured for {activity} / \u5C1A\u672A\u8A2D\u5B9A\u652F\u63F4 timer \u7684\u8208\u8DA3\u6D3B\u52D5: {activity}\u3002",
  "view.bookShelf.empty": "No Reading items yet. Run New reading item / \u5C1A\u672A\u6709\u95B1\u8B80\u9805\u76EE\u3002\u8ACB\u57F7\u884C New reading item\u3002",
  "view.bookShelf.emptyFiltered": "No Reading items with status / \u6C92\u6709\u72C0\u614B\u70BA {statuses} \u7684\u95B1\u8B80\u9805\u76EE\u3002",
  "view.bookShelf.invalidStatuses": "Unknown book shelf status values / \u672A\u77E5\u7684\u66F8\u67B6\u72C0\u614B\u503C: {statuses}",
  "view.timer.needsReadingItem": "Timer can only run from a saved Reading item note / Timer \u53EA\u53EF\u5728\u5DF2\u5132\u5B58\u7684\u95B1\u8B80\u9805\u76EE\u7B46\u8A18\u57F7\u884C\u3002",
  "view.timer.total": "Total / \u7E3D\u8A08: {minutes} min / \u5206\u9418",
  "view.timer.runningSince": "Timer running since / Timer \u958B\u59CB\u65BC {time}",
  "view.timer.stop": "Stop / \u505C\u6B62",
  "view.timer.resume": "Resume / \u7E7C\u7E8C",
  "view.timer.discard": "Discard / \u653E\u68C4",
  "view.timer.start": "Start / \u958B\u59CB",
  "view.gymLog.needsSession": "Gym logger can only run from a saved gym session note / \u5065\u8EAB\u8A18\u9304\u5668\u53EA\u53EF\u5728\u5DF2\u5132\u5B58\u7684\u5065\u8EAB\u7B46\u8A18\u57F7\u884C\u3002",
  "view.gymLog.exercise": "Exercise / \u52D5\u4F5C",
  "view.gymLog.weight": "Weight / \u91CD\u91CF",
  "view.gymLog.reps": "Reps / \u6B21\u6578",
  "view.gymLog.notes": "Notes / \u5099\u8A3B",
  "view.gymLog.add": "Add set / \u65B0\u589E\u4E00\u7D44",
  "view.gymLog.newExercise": "New exercise\u2026 / \u65B0\u589E\u52D5\u4F5C\u2026",
  "view.gymLog.emptyCatalog": "No saved exercises yet. Choose New exercise\u2026 to add one / \u5C1A\u672A\u5132\u5B58\u52D5\u4F5C\u3002\u8ACB\u9078\u300C\u65B0\u589E\u52D5\u4F5C\u2026\u300D\u3002",
  "view.gymLog.customMuscle": "Custom\u2026 / \u81EA\u8A02\u2026",
  "muscle.Chest": "Chest / \u80F8",
  "muscle.Back": "Back / \u80CC",
  "muscle.Shoulders": "Shoulders / \u80A9",
  "muscle.Biceps": "Biceps / \u4E8C\u982D",
  "muscle.Triceps": "Triceps / \u4E09\u982D",
  "muscle.Quads": "Quads / \u80A1\u56DB\u982D",
  "muscle.Hamstrings": "Hamstrings / \u817F\u5F8C\u8171",
  "muscle.Glutes": "Glutes / \u81C0",
  "muscle.Calves": "Calves / \u5C0F\u817F",
  "muscle.Core": "Core / \u6838\u5FC3"
};

// src/i18n/index.ts
var DEFAULT_LANGUAGE = "zh-Hant-en";
var TABLES = {
  en,
  "zh-Hant-en": zhHantEn
};
function isLanguage(value) {
  return value === "en" || value === "zh-Hant-en";
}
function t(key, language, vars) {
  const table = TABLES[language] ?? TABLES[DEFAULT_LANGUAGE];
  let out = table[key] ?? TABLES.en[key] ?? key;
  if (!vars) return out;
  for (const [name, value] of Object.entries(vars)) {
    out = out.split(`{${name}}`).join(String(value));
  }
  return out;
}

// src/util/prompt-text.ts
var import_obsidian = require("obsidian");
function promptText(app, title, defaultValue, language) {
  return new Promise((resolve) => {
    const modal = new class extends import_obsidian.Modal {
      constructor() {
        super(...arguments);
        this.value = defaultValue;
        this.resolved = false;
      }
      onOpen() {
        this.modalEl.setAttr("data-testid", "atomic-prompt-modal");
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: title });
        new import_obsidian.Setting(contentEl).addText((text) => {
          text.setValue(defaultValue);
          text.inputEl.setCssStyles({ width: "100%" });
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
          (btn) => btn.setButtonText(t("modal.cancel", language)).onClick(() => this.finish(null))
        ).addButton(
          (btn) => btn.setButtonText(t("modal.ok", language)).setCta().onClick(() => this.finish(this.value))
        );
      }
      finish(v) {
        if (this.resolved) return;
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

// src/util/codeblock-languages.ts
var ATOMIC_CODEBLOCK_LANGUAGES = [
  "atomic-heatmap",
  "atomic-today",
  "atomic-dashboard",
  "atomic-actions",
  "atomic-golf-cues",
  "atomic-gym-cues",
  "atomic-cues",
  "atomic-timer",
  "atomic-gym-log",
  "atomic-bookshelf"
];
function codeblockLanguages() {
  return [...ATOMIC_CODEBLOCK_LANGUAGES];
}
function resolveCueActivity(kind, options) {
  if (kind === "atomic-golf-cues") return "golf";
  if (kind === "atomic-gym-cues") return "gym";
  if (kind !== "atomic-cues") return null;
  const activity = options.activity?.trim();
  return activity || null;
}

// src/util/codeblock-defaults.ts
var BLOCK_SPECS = {
  "atomic-heatmap": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearHeatmap"
      },
      {
        key: "activity",
        example: "all",
        commentKey: "block.opt.activityHeatmap"
      },
      {
        key: "rows",
        example: "1",
        commentKey: "block.opt.rows"
      },
      {
        key: "columns",
        example: "1",
        commentKey: "block.opt.columns"
      },
      {
        key: "min-column-width",
        example: "300",
        commentKey: "block.opt.minColumnWidth"
      },
      {
        key: "default-span",
        example: "1.2",
        commentKey: "block.opt.defaultSpan"
      }
    ]
  },
  "atomic-today": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "date",
        example: "2026-08-08",
        commentKey: "block.opt.dateToday"
      }
    ]
  },
  "atomic-dashboard": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearDashboard"
      }
    ]
  },
  "atomic-actions": {
    emptyKey: "block.opt.noneActions",
    options: []
  },
  "atomic-golf-cues": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearCues"
      }
    ]
  },
  "atomic-gym-cues": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearCues"
      }
    ]
  },
  "atomic-cues": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "activity",
        example: "golf",
        commentKey: "block.opt.activityCues",
        defaultActive: true
      },
      {
        key: "year",
        example: "2026",
        commentKey: "block.opt.yearCues"
      }
    ]
  },
  "atomic-timer": {
    emptyKey: "block.opt.noneTimer",
    options: []
  },
  "atomic-gym-log": {
    emptyKey: "block.opt.noneGymLog",
    options: []
  },
  "atomic-bookshelf": {
    headerKey: "block.opt.header",
    options: [
      {
        key: "activity",
        example: "reading",
        commentKey: "block.opt.activityBookshelf",
        defaultActive: true
      },
      {
        key: "status",
        example: "all",
        commentKey: "block.opt.statusBookshelf"
      },
      {
        key: "scale",
        example: "1",
        commentKey: "block.opt.scaleBookshelf"
      }
    ]
  }
};
function optionLine(spec, language, values) {
  const comment = t(spec.commentKey, language);
  const hasOverride = Object.prototype.hasOwnProperty.call(values, spec.key);
  const active = hasOverride ? values[spec.key] : spec.defaultActive ? spec.example : void 0;
  const pair = `${spec.key}: ${active ?? spec.example}`;
  const line = `${pair}  # ${comment}`;
  return active !== void 0 ? line : `# ${line}`;
}
function defaultAtomicBlockBody(kind, language = "en", values = {}) {
  const spec = BLOCK_SPECS[kind];
  const lines = [];
  if (spec.headerKey) lines.push(`# ${t(spec.headerKey, language)}`);
  if (spec.emptyKey) lines.push(`# ${t(spec.emptyKey, language)}`);
  for (const option of spec.options) {
    lines.push(optionLine(option, language, values));
  }
  return `${lines.join("\n")}
`;
}
function defaultAtomicBlockFence(kind, language = "en", values = {}) {
  return `\`\`\`${kind}
${defaultAtomicBlockBody(kind, language, values)}\`\`\`
`;
}

// src/util/yaml.ts
function yamlScalar(value) {
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

// src/commands/create-session.ts
function suggestOne(app, placeholder, items, labels) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new class extends import_obsidian2.FuzzySuggestModal {
      getItems() {
        return items;
      }
      getItemText(item) {
        const i = items.indexOf(item);
        return labels && labels[i] ? labels[i] : item;
      }
      onChooseItem(item) {
        if (settled) return;
        settled = true;
        resolve(item);
      }
      onClose() {
        if (settled) return;
        settled = true;
        resolve(null);
      }
    }(app);
    modal.setPlaceholder(placeholder);
    modal.open();
  });
}
function gymBody(activity, date, location, locationDetail, weightUnit, language) {
  const muscleHints = language === "en" ? ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core"] : [
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
activity: ${yamlScalar(activity.id)}
duration_min:
location: ${yamlScalar(location)}
location_detail: ${yamlScalar(locationDetail)}
weight_unit: ${weightUnit}
---

# ${activity.label} \u2014 ${date}

<!-- \u{1F4AA} ${t("template.gymMuscles", language)}: ${muscleHints.join(", ")} -->

${defaultAtomicBlockFence("atomic-gym-log", language)}
| ${t("template.gymTable.exercise", language)} | ${t("template.gymTable.muscle", language)} | ${t("template.gymTable.weight", language)} | ${t("template.gymTable.reps", language)} | ${t("template.gymTable.notes", language)} |
| --- | --- | --- | --- | --- |
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}
function golfBody(activity, date, language) {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
location:
focus: []
club: []
felt:
---

# ${activity.label} \u2014 ${date}

<!-- ${t("template.golfLocationHint", language)} -->
<!-- ${t("template.golfFocusHint", language)} -->
<!-- ${t("template.golfClubHint", language)} -->
<!-- ${t("template.golfFeltHint", language)} -->
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}
function genericExerciseBody(activity, date, language) {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
location:
---

# ${activity.label} \u2014 ${date}
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}
async function promptSessionDate(app, timezone, language) {
  const today = ymdInZone(/* @__PURE__ */ new Date(), timezone);
  const dateRaw = await promptText(app, t("modal.dateTitle", language), today, language);
  if (dateRaw === null) return null;
  const date = dateRaw.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    new import_obsidian2.Notice(t("notice.invalidDate", language));
    return null;
  }
  return date;
}
async function gymSessionBody(app, activity, date, language) {
  const locationItems = [...GYM_LOCATIONS, CUSTOM_LOCATION_SENTINEL];
  const locationLabels = [
    t("location.home", language),
    t("location.commercial", language),
    t("location.hotelTravel", language),
    t("location.other", language),
    t("property.location.custom", language)
  ];
  const selected = await suggestOne(
    app,
    t("modal.locationPlaceholder", language),
    locationItems,
    locationLabels
  ) || "";
  let customPromptRaw;
  if (selected === CUSTOM_LOCATION_SENTINEL) {
    customPromptRaw = await promptText(
      app,
      t("modal.customLocation", language),
      "",
      language
    );
  }
  const { location, wasCustom, emptyCustomNotice } = resolveGymCreateLocation(
    selected,
    customPromptRaw
  );
  if (emptyCustomNotice) {
    new import_obsidian2.Notice(t("notice.emptyCustomLocation", language));
  }
  let locationDetail = "";
  if (gymCreateLocationNeedsDetail(location, wasCustom)) {
    locationDetail = await promptText(
      app,
      t("modal.otherLocationDetail", language),
      "",
      language
    ) || "";
  }
  let weightUnit = await suggestOne(app, t("modal.weightUnitPlaceholder", language), [
    "kg",
    "lb"
  ]) || "kg";
  if (weightUnit !== "lb") weightUnit = "kg";
  return gymBody(activity, date, location, locationDetail, weightUnit, language);
}
async function createActivitySession(app, data, activity, timezone, language) {
  const date = await promptSessionDate(app, timezone, language);
  if (!date) return;
  const year = date.slice(0, 4);
  const folder = `${activity.folder}/${year}`;
  const target = `${folder}/${date}.md`;
  if (data.exists(target)) {
    await data.openPath(target);
    new import_obsidian2.Notice(
      t("notice.openedExistingSession", language, {
        activity: activity.label,
        path: target
      })
    );
    return;
  }
  const body = activity.supportsSetTable ? await gymSessionBody(app, activity, date, language) : activity.id === "golf" ? golfBody(activity, date, language) : genericExerciseBody(activity, date, language);
  await data.createNote(target, body);
  await data.openPath(target);
  new import_obsidian2.Notice(
    t("notice.createdSession", language, {
      activity: activity.label,
      path: target
    })
  );
}
async function createGymSession(app, data, activity, timezone, language) {
  await createActivitySession(app, data, activity, timezone, language);
}
async function createGolfSession(app, data, activity, timezone, language) {
  await createActivitySession(app, data, activity, timezone, language);
}

// src/util/notice.ts
function showNotice(message) {
  const obsidian = require("obsidian");
  new obsidian.Notice(message);
}

// src/util/vault-path.ts
function normalizeSlashes(path) {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
function isSafeVaultFolder(folder) {
  if (typeof folder !== "string") return false;
  const trimmed = folder.trim();
  if (!trimmed) return false;
  const normalized = normalizeSlashes(trimmed);
  if (!normalized || normalized === "/") return false;
  if (normalized.startsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(normalized)) return false;
  const segments = normalized.replace(/\/$/, "").split("/");
  if (segments.length === 0) return false;
  for (const seg of segments) {
    if (!seg || seg === "." || seg === "..") return false;
  }
  return true;
}
function sessionScanPrefix(folder, year) {
  if (!isSafeVaultFolder(folder)) return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/${year}/`;
}
function readingItemsFolder(folder) {
  if (!isSafeVaultFolder(folder)) return null;
  const base = normalizeSlashes(folder.trim()).replace(/\/$/, "");
  return `${base}/Items`;
}
function hobbyItemsScanPrefix(folder) {
  const itemsFolder = readingItemsFolder(folder);
  return itemsFolder ? `${itemsFolder}/` : null;
}
function normalizeVaultPath(path) {
  return normalizeSlashes(path.trim()).replace(/\/$/, "");
}
function pathTouchesScope(path, scope) {
  if (!path || !scope) return false;
  const p = normalizeVaultPath(path);
  const s = normalizeVaultPath(scope);
  if (!p || !s) return false;
  return p === s || p.startsWith(`${s}/`) || s.startsWith(`${p}/`);
}

// src/commands/hobby-item.ts
var FALLBACK_BOOK_TITLE = "Untitled Book";
function normalizeSlashes2(path) {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
function cleanBookTitle(title) {
  const cleaned = String(title || "").replace(/[\\/:*?"<>|#[\]\r\n\t]/g, " ").replace(/\.+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || FALLBACK_BOOK_TITLE;
}
function buildHobbyItemPath(activityFolder, title) {
  if (!isSafeVaultFolder(activityFolder)) {
    throw new Error("Hobby folder must be a safe vault-relative folder");
  }
  const base = normalizeSlashes2(activityFolder.trim()).replace(/\/$/, "");
  return `${base}/Items/${cleanBookTitle(title)}.md`;
}
function buildReadingItemPath(activityFolder, title) {
  return buildHobbyItemPath(activityFolder, title);
}
function readingItemMarkdown(title, language = "en", activityId = "reading") {
  const cleanedTitle = cleanBookTitle(title);
  const activity = activityId.trim() || "reading";
  return `---
type: atomic-item
domain: hobby
activity: ${activity}
status: ${DEFAULT_READING_STATUS}
authors:
  - ""
description: ""
pages:
cover: ""
tags:
  - books
spine_color:
total_min: 0
timer_started_at:
related_canvas:
---

# ${cleanedTitle}

## ${t("template.readingRemarks", language)}

## ${t("template.readingTimeLog", language)}

${defaultAtomicBlockFence("atomic-timer", language)}`;
}

// src/commands/create-reading-item.ts
async function createHobbyItem(app, data, hobbyActivity, language) {
  const title = await promptText(
    app,
    t("modal.hobbyItemTitle", language, { label: hobbyActivity.label }),
    "",
    language
  );
  if (title === null) return;
  const path = buildHobbyItemPath(hobbyActivity.folder, title);
  try {
    if (data.exists(path)) {
      await data.openPath(path);
      showNotice(
        t("notice.openedExistingHobbyItem", language, {
          label: hobbyActivity.label,
          path
        })
      );
      return;
    }
    await data.createNote(
      path,
      readingItemMarkdown(title, language, hobbyActivity.id)
    );
    await data.openPath(path);
    showNotice(
      t("notice.createdHobbyItem", language, {
        label: hobbyActivity.label,
        path
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.hobbyItemFailed", language, { message }));
  }
}
async function createReadingItem(app, data, readingActivity, language) {
  const title = await promptText(
    app,
    t("modal.readingItemTitle", language),
    "",
    language
  );
  if (title === null) return;
  const path = buildReadingItemPath(readingActivity.folder, title);
  try {
    if (data.exists(path)) {
      await data.openPath(path);
      showNotice(
        t("notice.openedExistingReadingItem", language, {
          path
        })
      );
      return;
    }
    await data.createNote(
      path,
      readingItemMarkdown(title, language, readingActivity.id)
    );
    await data.openPath(path);
    showNotice(
      t("notice.createdReadingItem", language, {
        path
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingItemFailed", language, { message }));
  }
}

// src/codeblocks.ts
var import_obsidian6 = require("obsidian");

// src/util/parse-block.ts
function parseBlockOptions(source) {
  const out = {};
  for (const line of String(source || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/\s+#.*$/, "").trim();
    out[m[1]] = value.replace(/^["']|["']$/g, "");
  }
  return out;
}

// src/util/block-render.ts
var ATOMIC_BLOCK_HOST_CLASS = "atomic-block-host";
var ATOMIC_BLOCK_PENDING_CLASS = "fitness-plugin atomic-block-pending";
var ATOMIC_BLOCK_PENDING_BAR_CLASS = "atomic-block-pending-bar";
var generations = /* @__PURE__ */ new WeakMap();
var chains = /* @__PURE__ */ new WeakMap();
function markAtomicBlockHost(el) {
  if (typeof el.addClass === "function") {
    el.addClass(ATOMIC_BLOCK_HOST_CLASS);
    return;
  }
  el.classList?.add(ATOMIC_BLOCK_HOST_CLASS);
}
function mountAtomicBlockShell(el) {
  el.empty();
  markAtomicBlockHost(el);
  const root = el.createDiv({ cls: ATOMIC_BLOCK_PENDING_CLASS });
  root.createDiv({ cls: ATOMIC_BLOCK_PENDING_BAR_CLASS });
  return root;
}
function beginBlockRender(el) {
  const next = (generations.get(el) ?? 0) + 1;
  generations.set(el, next);
  return next;
}
function isStaleBlockRender(el, generation) {
  return generations.get(el) !== generation;
}
function currentBlockGeneration(el) {
  return generations.get(el) ?? 0;
}
function invalidateBlockRenderIfCurrent(el, generation) {
  if (!isStaleBlockRender(el, generation)) {
    beginBlockRender(el);
  }
}
function enqueueBlockRender(el, work) {
  const generation = beginBlockRender(el);
  const previous = chains.get(el) ?? Promise.resolve();
  const next = previous.then(
    () => work(generation),
    () => work(generation)
  );
  chains.set(el, next);
  return next;
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
var BLUE = [
  "#bfdbfe",
  "#60a5fa",
  "#2563eb",
  "#1e3a8a"
];
var EMPTY_CELL = "#ebedf0";
var DEFAULT_ACTIVITY_TYPES = [
  {
    id: "gym",
    domain: "exercise",
    label: "\u{1F3CB}\uFE0F Gym / \u5065\u8EAB",
    folder: "atomics/exercise/Gym",
    enabled: true,
    baseColor: GREEN[2],
    colors: GREEN,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: true
  },
  {
    id: "golf",
    domain: "exercise",
    label: "\u26F3 Golf / \u9AD8\u723E\u592B",
    folder: "atomics/exercise/Golf",
    enabled: true,
    baseColor: ORANGE[2],
    colors: ORANGE,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: false
  },
  {
    id: "reading",
    domain: "hobby",
    label: "Reading / \u7747\u66F8",
    folder: "atomics/hobbies/Reading",
    enabled: true,
    baseColor: BLUE[2],
    colors: BLUE,
    noteModel: "item",
    supportsCues: false,
    supportsTimer: true,
    supportsSetTable: false
  }
];
var DEFAULT_SETTINGS = {
  language: "zh-Hant-en",
  timezone: "Asia/Hong_Kong",
  dashboardPath: "atomics/Dashboard.md",
  golfCuesPath: "atomics/exercise/Golf/Cues.md",
  gymCuesPath: "atomics/exercise/Gym/Cues.md",
  activityTypes: DEFAULT_ACTIVITY_TYPES,
  gymExercises: [],
  gymLogSetup: "complete"
};

// src/util/colors.ts
var BUILTIN_SHADES = {
  [GREEN[2].toLowerCase()]: GREEN,
  [ORANGE[2].toLowerCase()]: ORANGE,
  [BLUE[2].toLowerCase()]: BLUE
};
function isHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}
function expandHex(hex) {
  const cleaned = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9a-f]{3}$/.test(cleaned)) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return GREEN[2];
}
function parseRgb(hex) {
  const full = expandHex(hex);
  return {
    r: Number.parseInt(full.slice(1, 3), 16),
    g: Number.parseInt(full.slice(3, 5), 16),
    b: Number.parseInt(full.slice(5, 7), 16)
  };
}
function toHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function mix(from, to, amount) {
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount
  };
}
function shadesFromBaseColor(baseColor) {
  const normalized = expandHex(baseColor);
  const builtin = BUILTIN_SHADES[normalized];
  if (builtin) return [builtin[0], builtin[1], builtin[2], builtin[3]];
  const base = parseRgb(normalized);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  return [
    toHex(mix(base, white, 0.55)),
    toHex(mix(base, white, 0.25)),
    normalized,
    toHex(mix(base, black, 0.35))
  ];
}
function defaultBaseColorForDomain(domain) {
  return domain === "hobby" ? BLUE[2] : GREEN[2];
}

// src/util/activity-types.ts
var FALLBACK_EXERCISE_NAME = "Exercise";
var FALLBACK_HOBBY_NAME = "Hobby";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cleanFolderSegment(label) {
  const cleaned = label.replace(/[\\/:*?"<>|#[\]\r\n\t]/g, " ").replace(/\.+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || FALLBACK_EXERCISE_NAME;
}
function activityIdFromLabel(label) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return id || "activity";
}
function defaultExerciseFolder(label) {
  const folder = `atomics/exercise/${cleanFolderSegment(label)}`;
  return isSafeVaultFolder(folder) ? folder : `atomics/exercise/${FALLBACK_EXERCISE_NAME}`;
}
function defaultHobbyFolder(label) {
  const cleaned = cleanFolderSegment(label);
  const folder = `atomics/hobbies/${cleaned === FALLBACK_EXERCISE_NAME ? FALLBACK_HOBBY_NAME : cleaned}`;
  return isSafeVaultFolder(folder) ? folder : `atomics/hobbies/${FALLBACK_HOBBY_NAME}`;
}
function colorTuple(value, fallback) {
  if (!Array.isArray(value) || value.length !== 4) return fallback;
  const items = value;
  const [first, second, third, fourth] = items;
  if (typeof first === "string" && first.trim() !== "" && typeof second === "string" && second.trim() !== "" && typeof third === "string" && third.trim() !== "" && typeof fourth === "string" && fourth.trim() !== "") {
    return [first, second, third, fourth];
  }
  return fallback;
}
function resolveBaseColor(value, domain, fallbackColors) {
  if (typeof value.baseColor === "string" && isHexColor(value.baseColor)) {
    return value.baseColor.trim().toLowerCase().length === 4 ? shadesFromBaseColor(value.baseColor)[2] : expandToSix(value.baseColor.trim());
  }
  const fromColors = colorTuple(value.colors, fallbackColors)[2];
  if (typeof fromColors === "string" && isHexColor(fromColors)) {
    return expandToSix(fromColors.trim());
  }
  return defaultBaseColorForDomain(domain);
}
function expandToSix(hex) {
  const cleaned = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9a-f]{3}$/.test(cleaned)) {
    const [, r, g, b] = cleaned;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return defaultBaseColorForDomain("exercise");
}
function withDerivedColors(activity) {
  const baseColor = expandToSix(activity.baseColor);
  return {
    ...activity,
    baseColor,
    colors: shadesFromBaseColor(baseColor)
  };
}
function createExerciseActivityType(label) {
  const cleanedLabel = cleanFolderSegment(label);
  return withDerivedColors({
    id: activityIdFromLabel(cleanedLabel),
    domain: "exercise",
    label: cleanedLabel,
    folder: defaultExerciseFolder(cleanedLabel),
    enabled: true,
    baseColor: GREEN[2],
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: false
  });
}
function createHobbyActivityType(label) {
  const cleanedLabel = cleanFolderSegment(label);
  const labelForHobby = cleanedLabel === FALLBACK_EXERCISE_NAME ? FALLBACK_HOBBY_NAME : cleanedLabel;
  return withDerivedColors({
    id: activityIdFromLabel(labelForHobby),
    domain: "hobby",
    label: labelForHobby,
    folder: defaultHobbyFolder(labelForHobby),
    enabled: true,
    baseColor: defaultBaseColorForDomain("hobby"),
    noteModel: "item",
    supportsCues: false,
    supportsTimer: true,
    supportsSetTable: false
  });
}
function domainFrom(value) {
  return value === "exercise" || value === "hobby" ? value : null;
}
function noteModelFrom(value) {
  return value === "dailySession" || value === "item" ? value : null;
}
function normalizeActivityType(value, fallbackColors) {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const folder = typeof value.folder === "string" ? value.folder.trim() : "";
  const domain = domainFrom(value.domain);
  const noteModel = noteModelFrom(value.noteModel);
  if (!label || !folder || !domain || !noteModel || !isSafeVaultFolder(folder)) {
    return null;
  }
  const idRaw = typeof value.id === "string" ? value.id.trim() : "";
  const id = activityIdFromLabel(idRaw || label);
  const baseColor = resolveBaseColor(value, domain, fallbackColors);
  return withDerivedColors({
    id,
    domain,
    label,
    folder,
    enabled: value.enabled !== false,
    baseColor,
    noteModel,
    supportsCues: domain === "exercise" && value.supportsCues === true,
    supportsTimer: domain === "hobby" && value.supportsTimer === true,
    supportsSetTable: domain === "exercise" && noteModel === "dailySession" && value.supportsSetTable === true
  });
}
function activityTypeFromSeries(value, fallbackColors) {
  if (!isRecord(value)) return null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const folder = typeof value.folder === "string" ? value.folder.trim() : "";
  if (!label || !folder || !isSafeVaultFolder(folder)) return null;
  const idRaw = typeof value.id === "string" ? value.id.trim() : "";
  const kind = value.kind === "gym" || value.kind === "golf" ? value.kind : "generic";
  const id = activityIdFromLabel(idRaw || kind || label);
  const colors = colorTuple(
    value.colors,
    kind === "golf" ? ORANGE : fallbackColors
  );
  const baseColor = resolveBaseColor(
    { ...value, colors },
    "exercise",
    colors
  );
  return withDerivedColors({
    id,
    domain: "exercise",
    label,
    folder,
    enabled: value.enabled !== false,
    baseColor,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: kind === "gym"
  });
}
function exerciseActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.enabled !== false && activity.domain === "exercise" && activity.noteModel === "dailySession"
  );
}
function hobbyActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.enabled !== false && activity.domain === "hobby" && activity.noteModel === "item" && activity.supportsTimer
  );
}
function allHobbyActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.domain === "hobby" && activity.noteModel === "item" && activity.supportsTimer
  );
}
function allExerciseActivities(activityTypes) {
  return activityTypes.filter(
    (activity) => activity.domain === "exercise" && activity.noteModel === "dailySession"
  );
}
function resolveCueActivityType(activityTypes, activityId) {
  const normalizedId = activityId.trim().toLowerCase();
  return exerciseActivities(activityTypes).find(
    (activity) => activity.supportsCues && activity.id.toLowerCase() === normalizedId
  );
}
function cuePathForActivity(activity) {
  return `${activity.folder.replace(/\/$/, "")}/Cues.md`;
}

// src/util/action-activities.ts
function actionActivities(activityTypes) {
  return [
    ...exerciseActivities(activityTypes),
    ...hobbyActivities(activityTypes)
  ];
}

// src/views/actions.ts
function renderActions(el, plugin) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const wrap = root.createDiv({ cls: "fitness-actions" });
  for (const activity of actionActivities(plugin.settings.activityTypes)) {
    const button = wrap.createEl("button", { text: activity.label });
    button.addEventListener("click", () => {
      if (activity.domain === "hobby" && activity.noteModel === "item") {
        void plugin.createHobbyItem(activity);
        return;
      }
      void plugin.createExerciseSession(activity);
    });
  }
}

// src/views/cues.ts
function resolveCuesYear(opts, frontmatterYear2, timezone) {
  if (opts.year && Number(opts.year)) return Number(opts.year);
  const n = Number(frontmatterYear2);
  if (Number.isFinite(n) && n >= 1970) return n;
  return nowYear(timezone);
}
async function renderCues(el, data, activityTypes, year, timezone, activity, language) {
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin",
    attr: { "data-testid": "atomic-cues", "data-activity": activity }
  });
  const activityType = resolveCueActivityType(activityTypes, activity);
  if (!activityType) {
    root.createEl("p", {
      text: t("view.cues.noCueActivity", language, { activity }),
      cls: "fitness-muted"
    });
    return;
  }
  const currentYear = nowYear(timezone);
  const month = year === currentYear ? nowMonth(timezone) : 12;
  const monthLabel = formatMonthLabel(year, month, language);
  const cues = [];
  for (const p of data.listSessions(activityType.folder, year)) {
    if (!p.date) continue;
    const md = await data.readBody(p.path);
    const focus = p.focus.join(", ");
    for (const text of parseReminders(md)) {
      if (!text) continue;
      cues.push({ text, date: p.date, focus });
    }
  }
  const thisMonth = cuesInCalendarMonth(cues, year, month);
  const keepers = buildKeepers(cues, year);
  root.createEl("h2", {
    text: t("view.cues.thisMonth", language, { month: monthLabel })
  });
  if (!thisMonth.length) {
    root.createEl("p", {
      text: t("view.cues.noReminders", language),
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
    text: t("view.cues.keepers", language, { year })
  });
  if (!keepers.length) {
    root.createEl("p", {
      text: t("view.cues.noKeepers", language),
      cls: "fitness-muted"
    });
  } else {
    const ul = root.createEl("ul");
    for (const k of keepers) {
      const focusBit = k.focus ? ` \xB7 ${k.focus}` : "";
      const li = ul.createEl("li");
      li.createEl("strong", { text: k.text });
      li.appendText(
        t("view.cues.lastSeen", language, {
          count: k.count,
          lastSeen: k.lastSeen,
          focus: focusBit
        })
      );
    }
  }
}

// src/core/hobby.ts
var TIME_LOG_HEADING = /^#{1,6}\s+Time log\s*$/i;
var HEADING = /^(#{1,6})\s+/;
var TIMER_METADATA = /<!--\s*atomic-timer\s+start="([^"]+)"\s+end="([^"]+)"\s*-->/;
var TIME_LOG_ENTRY = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})\s*(?:-|\u2013|\u2014)\s*(\d{2}:\d{2}))?\s*(?:\||\u00b7)?\s*(\d+)\s*min(?:\s*(?:\||\u2014|-)\s*(.*?))?\s*$/;
function parseTimeLog(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const entries = [];
  let timeLogLevel = null;
  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading && timeLogLevel !== null && heading[1].length <= timeLogLevel) {
      break;
    }
    if (TIME_LOG_HEADING.test(line.trim())) {
      timeLogLevel = line.match(HEADING)?.[1].length ?? 0;
      continue;
    }
    if (timeLogLevel === null) continue;
    const entry = parseTimeLogLine(line);
    if (entry) entries.push(entry);
  }
  return entries;
}
function appendTimeLog(markdown, entry) {
  const normalizedEntry = normalizeEntry(entry);
  if (hasMatchingIsoEntry(parseTimeLog(markdown), normalizedEntry)) {
    return ensureTrailingNewline(markdown);
  }
  const entryLine = formatTimeLogEntry(normalizedEntry);
  const lines = String(markdown || "").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => TIME_LOG_HEADING.test(line.trim()));
  if (headingIndex === -1) {
    const base = trimTrailingBlankLines(lines).join("\n");
    return `${base}${base ? "\n\n" : ""}## Time log

${entryLine}
`;
  }
  const headingLevel = lines[headingIndex].match(HEADING)?.[1].length ?? 0;
  let sectionEnd = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(HEADING);
    if (heading && heading[1].length <= headingLevel) {
      sectionEnd = index;
      break;
    }
  }
  let insertAt = sectionEnd;
  while (insertAt > headingIndex + 1 && lines[insertAt - 1].trim() === "") {
    insertAt -= 1;
  }
  const before = lines.slice(0, insertAt);
  const after = lines.slice(sectionEnd);
  if (before[before.length - 1]?.trim() === lines[headingIndex].trim()) {
    before.push("");
  }
  before.push(entryLine);
  if (after.length > 0 && after[0].trim() !== "") {
    before.push("");
  }
  return ensureTrailingNewline([...before, ...after].join("\n"));
}
function stopTimer(input) {
  const startedAtMs = Date.parse(input.startedAtIso);
  const stoppedAtMs = Date.parse(input.stoppedAtIso);
  if (!Number.isFinite(startedAtMs)) {
    throw new Error("Invalid timer start time");
  }
  if (!Number.isFinite(stoppedAtMs)) {
    throw new Error("Invalid timer stop time");
  }
  if (stoppedAtMs < startedAtMs) {
    throw new Error("Timer stop time cannot be before start time");
  }
  const minutes = Math.round((stoppedAtMs - startedAtMs) / 6e4);
  const entry = {
    date: dateFromIso(input.startedAtIso),
    minutes,
    note: input.note?.trim() ?? "",
    startIso: input.startedAtIso,
    endIso: input.stoppedAtIso
  };
  const existingEntries = parseTimeLog(input.markdown);
  const alreadyLogged = hasMatchingIsoEntry(existingEntries, entry);
  const markdownWithLog = alreadyLogged ? input.markdown : appendTimeLog(input.markdown, entry);
  const frontmatter = readTimerFrontmatter(input.markdown);
  const previousLogTotal = sumMinutes(existingEntries);
  const totalMin = alreadyLogged ? Math.max(frontmatter.totalMin, previousLogTotal) : Math.max(frontmatter.totalMin, previousLogTotal) + minutes;
  const markdown = updateTimerFrontmatter(markdownWithLog, {
    totalMin,
    timerStartedAtIso: null
  });
  return { markdown, minutes, totalMin };
}
function minutesByDate(entries) {
  const totals = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.minutes);
  }
  return totals;
}
function minutesByDateForYear(entries, year) {
  const prefix = `${year}-`;
  return minutesByDate(entries.filter((entry) => entry.date.startsWith(prefix)));
}
function sumMinutesForYear(entries, year) {
  const prefix = `${year}-`;
  let total = 0;
  for (const entry of entries) {
    if (entry.date.startsWith(prefix)) total += entry.minutes;
  }
  return total;
}
function readTimerFrontmatter(markdown) {
  const parts = splitFrontmatter(markdown);
  if (!parts) return { totalMin: 0, timerStartedAt: null };
  let totalMin = 0;
  let timerStartedAt = null;
  for (let index = 1; index < parts.endIndex; index += 1) {
    const line = parts.lines[index];
    const totalMatch = line.match(/^total_min\s*:\s*(.*)$/);
    if (totalMatch) {
      const total = Number(unquoteYamlScalar(totalMatch[1]));
      totalMin = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
      continue;
    }
    const startedMatch = line.match(/^timer_started_at\s*:\s*(.*)$/);
    if (startedMatch) {
      timerStartedAt = emptyToNull(unquoteYamlScalar(startedMatch[1]));
    }
  }
  return { totalMin, timerStartedAt };
}
function updateTimerFrontmatter(markdown, fields) {
  const text = String(markdown || "");
  const parts = splitFrontmatter(text);
  if (!parts) {
    const frontmatter = [
      "---",
      ...fields.totalMin === void 0 ? [] : [`total_min: ${normalizeMinutes(fields.totalMin)}`],
      ...fields.timerStartedAtIso === void 0 ? [] : [formatTimerStartedAt(fields.timerStartedAtIso)],
      "---",
      ""
    ];
    return `${frontmatter.join("\n")}${text}`;
  }
  let lines = parts.lines.slice();
  if (fields.totalMin !== void 0) {
    lines = setFrontmatterField(
      lines,
      "total_min",
      `total_min: ${normalizeMinutes(fields.totalMin)}`
    );
  }
  if (fields.timerStartedAtIso !== void 0) {
    lines = setFrontmatterField(
      lines,
      "timer_started_at",
      formatTimerStartedAt(fields.timerStartedAtIso)
    );
  }
  return ensureTrailingNewline(lines.join("\n"));
}
function parseTimeLogLine(line) {
  const metadata = line.match(TIMER_METADATA);
  const visibleLine = line.replace(TIMER_METADATA, "").trimEnd();
  const match = visibleLine.match(TIME_LOG_ENTRY);
  if (!match) return null;
  return {
    date: match[1],
    minutes: Number(match[4]),
    note: (match[5] ?? "").trim(),
    ...metadata ? {
      startIso: unescapeHtmlAttribute(metadata[1]),
      endIso: unescapeHtmlAttribute(metadata[2])
    } : {}
  };
}
function normalizeEntry(entry) {
  return {
    date: entry.date,
    minutes: normalizeMinutes(entry.minutes),
    note: sanitizeLogNote(entry.note),
    ...entry.startIso ? { startIso: entry.startIso } : {},
    ...entry.endIso ? { endIso: entry.endIso } : {}
  };
}
function formatTimeLogEntry(entry) {
  const timeRange = entry.startIso && entry.endIso ? ` ${timeFromIso(entry.startIso)}-${timeFromIso(entry.endIso)}` : "";
  const note = entry.note ? ` | ${entry.note}` : "";
  const metadata = entry.startIso && entry.endIso ? ` <!-- atomic-timer start="${escapeHtmlAttribute(
    entry.startIso
  )}" end="${escapeHtmlAttribute(entry.endIso)}" -->` : "";
  return `- ${entry.date}${timeRange} | ${entry.minutes} min${note}${metadata}`;
}
function hasMatchingIsoEntry(entries, entry) {
  if (!entry.startIso || !entry.endIso) return false;
  return entries.some(
    (existing) => existing.startIso === entry.startIso && existing.endIso === entry.endIso
  );
}
function splitFrontmatter(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === "---") {
      return { lines, endIndex: index };
    }
  }
  return null;
}
function setFrontmatterField(lines, key, line) {
  const next = lines.slice();
  const endIndex = splitFrontmatter(next.join("\n"))?.endIndex;
  if (endIndex === void 0) return next;
  for (let index = 1; index < endIndex; index += 1) {
    if (new RegExp(`^${key}\\s*:`).test(next[index])) {
      next[index] = line;
      return next;
    }
  }
  next.splice(endIndex, 0, line);
  return next;
}
function formatTimerStartedAt(value) {
  if (!value) return "timer_started_at:";
  return `timer_started_at: "${escapeYamlDoubleQuoted(value)}"`;
}
function dateFromIso(iso) {
  const directDate = iso.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (directDate) return directDate[1];
  return new Date(iso).toISOString().slice(0, 10);
}
function timeFromIso(iso) {
  const directTime = iso.match(/T(\d{2}:\d{2})/);
  if (directTime) return directTime[1];
  return new Date(iso).toISOString().slice(11, 16);
}
function sumMinutes(entries) {
  return entries.reduce((total, entry) => total + entry.minutes, 0);
}
function normalizeMinutes(minutes) {
  return Math.max(0, Math.round(minutes));
}
function sanitizeLogNote(note) {
  return String(note || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}
function trimTrailingBlankLines(lines) {
  const next = lines.slice();
  while (next.length > 0 && next[next.length - 1].trim() === "") {
    next.pop();
  }
  return next;
}
function ensureTrailingNewline(markdown) {
  return markdown.endsWith("\n") ? markdown : `${markdown}
`;
}
function emptyToNull(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "~" || trimmed.toLowerCase() === "null") {
    return null;
  }
  return trimmed;
}
function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}
function escapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function escapeHtmlAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function unescapeHtmlAttribute(value) {
  return String(value).replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

// src/hobbies/book-shelf-host.ts
var BOOK_SHELF_HOST_REL = "atomics/hobbies/Reading/Book Shelf.md";
function bookShelfHostMarkdown(language = "en") {
  return defaultAtomicBlockFence("atomic-bookshelf", language);
}
async function createBookShelfHostFile(data, language = "en") {
  if (data.exists(BOOK_SHELF_HOST_REL)) {
    return { path: BOOK_SHELF_HOST_REL, created: false };
  }
  await data.createNote(BOOK_SHELF_HOST_REL, bookShelfHostMarkdown(language));
  return { path: BOOK_SHELF_HOST_REL, created: true };
}
async function createBookShelfHostCommand(data, language) {
  try {
    const result = await createBookShelfHostFile(data, language);
    showNotice(
      result.created ? t("notice.createdBookShelf", language, { path: result.path }) : t("notice.bookShelfExists", language, { path: result.path })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.bookShelfFailed", language, { message }));
  }
}
async function openBookShelfHostCommand(data, language) {
  try {
    const result = await createBookShelfHostFile(data, language);
    await data.openPath(result.path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.bookShelfFailed", language, { message }));
  }
}

// src/hobbies/reading-bookshelf.ts
var READING_BOOKSHELF_REL = "atomics/hobbies/Reading/Bookshelf.base";
var READING_ITEMS_FOLDER = "atomics/hobbies/Reading/Items";
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function callPluginIdLookup(method, self, id) {
  if (typeof method !== "function") return void 0;
  return method.call(self, id);
}
function readingBookshelfBaseYaml(itemsFolder = READING_ITEMS_FOLDER, language = "en") {
  if (!isSafeVaultFolder(itemsFolder)) {
    throw new Error("Reading items folder must be a safe vault-relative folder");
  }
  return `# ${t("template.readingBookshelfTitle", language)}
filters:
  and:
    - 'file.inFolder("${itemsFolder}")'
    - 'type == "atomic-item"'
    - 'activity == "reading"'
properties:
  file.name:
    displayName: ${t("template.base.title", language)}
  authors:
    displayName: ${t("template.base.authors", language)}
  description:
    displayName: ${t("template.base.description", language)}
  pages:
    displayName: ${t("template.base.pages", language)}
  status:
    displayName: ${t("template.base.status", language)}
  tags:
    displayName: ${t("template.base.tags", language)}
  total_min:
    displayName: ${t("template.base.totalMinutes", language)}
views:
  - type: cards
    name: ${t("template.base.cards", language)}
    image: cover
    order:
      - file.name
      - authors
      - description
      - pages
      - status
      - tags
      - total_min
  - type: table
    name: ${t("template.base.table", language)}
    order:
      - file.name
      - authors
      - description
      - pages
      - status
      - tags
      - total_min
`;
}
function needsReadingBookshelfUpgrade(content) {
  const legacyCards = /^\s+-\s+type:\s*cards[\s\S]*?\n\s+fields:\s*$/m.test(content);
  const legacyTable = /^\s+-\s+type:\s*table[\s\S]*?\n\s+columns:\s*$/m.test(content);
  return legacyCards || legacyTable;
}
function isBasesCorePluginEnabled(app) {
  const appRecord = app;
  if (!isRecord2(appRecord)) return false;
  const internalPlugins = appRecord.internalPlugins;
  if (!isRecord2(internalPlugins)) return false;
  try {
    if (callPluginIdLookup(internalPlugins.getEnabledPluginById, internalPlugins, "bases") != null) {
      return true;
    }
  } catch {
  }
  const plugins = internalPlugins.plugins;
  if (isRecord2(plugins)) {
    const bases = plugins.bases;
    if (isRecord2(bases) && bases.enabled === true) return true;
  }
  const config = internalPlugins.config;
  if (isRecord2(config) && config.bases === true) return true;
  try {
    const plugin = callPluginIdLookup(
      internalPlugins.getPluginById,
      internalPlugins,
      "bases"
    );
    if (isRecord2(plugin) && plugin.enabled === true) return true;
  } catch {
    return false;
  }
  return false;
}
async function createReadingBookshelfFile(data, itemsFolder = READING_ITEMS_FOLDER, language = "en") {
  const yaml = readingBookshelfBaseYaml(itemsFolder, language);
  if (!data.exists(READING_BOOKSHELF_REL)) {
    await data.createNote(READING_BOOKSHELF_REL, yaml);
    return { path: READING_BOOKSHELF_REL, created: true, updated: false };
  }
  const existing = await data.readBody(READING_BOOKSHELF_REL);
  if (needsReadingBookshelfUpgrade(existing)) {
    await data.writeNote(READING_BOOKSHELF_REL, yaml);
    return { path: READING_BOOKSHELF_REL, created: false, updated: true };
  }
  return { path: READING_BOOKSHELF_REL, created: false, updated: false };
}
async function createReadingBookshelfCommand(app, data, language) {
  if (!isBasesCorePluginEnabled(app)) {
    showNotice(t("notice.enableBases", language));
    return;
  }
  try {
    const result = await createReadingBookshelfFile(
      data,
      READING_ITEMS_FOLDER,
      language
    );
    if (result.created) {
      showNotice(t("notice.createdReadingBookshelf", language, { path: result.path }));
      return;
    }
    if (result.updated) {
      showNotice(t("notice.updatedReadingBookshelf", language, { path: result.path }));
      return;
    }
    showNotice(t("notice.readingBookshelfExists", language, { path: result.path }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingBookshelfFailed", language, { message }));
  }
}
async function openReadingBookshelfCommand(app, data, language) {
  if (!isBasesCorePluginEnabled(app)) {
    showNotice(t("notice.enableBases", language));
    return;
  }
  try {
    const result = await createReadingBookshelfFile(
      data,
      READING_ITEMS_FOLDER,
      language
    );
    await data.openPath(result.path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice(t("notice.readingBookshelfFailed", language, { message }));
  }
}

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
function collectGolfStats(page, feltCounts, focusCounts) {
  const felt = String(page.felt || "").toLowerCase();
  if (felt === "good" || felt === "ok" || felt === "bad") {
    feltCounts[felt] += 1;
  }
  for (const focus of page.focus) {
    focusCounts.set(focus, (focusCounts.get(focus) || 0) + 1);
  }
}
function sparkline(parent, values, color, language) {
  const max = Math.max(1, ...values);
  const span = parent.createSpan({ cls: "fitness-sparkline" });
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const h = Math.max(2, Math.round(v / max * 14));
    const bar = span.createSpan({ cls: "fitness-spark-bar" });
    bar.style.height = `${h}px`;
    bar.style.background = color;
    bar.setAttr("title", `${monthShortForLanguage(2e3, i + 1, 1, language)}: ${v}`);
  }
}
function resolveDashboardYear(opts, frontmatterYear2, timezone) {
  if (opts.year && Number(opts.year)) return Number(opts.year);
  const n = Number(frontmatterYear2);
  if (Number.isFinite(n) && n >= 1970) return n;
  return nowYear(timezone);
}
async function renderDashboard(el, data, activityTypes, year, language) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const activities = exerciseActivities(activityTypes);
  let totalDuration = 0;
  let totalVolumeKg = 0;
  const muscleVolume = /* @__PURE__ */ new Map();
  const muscleFreq = /* @__PURE__ */ new Map();
  const activityStats = activities.map((activity) => ({
    activity,
    pages: data.listSessions(activity.folder, year),
    sessionsByMonth: Array(12).fill(0),
    duration: 0,
    volumeByMonth: Array(12).fill(0),
    volumeKg: 0
  }));
  const feltCounts = { good: 0, ok: 0, bad: 0 };
  const focusCounts = /* @__PURE__ */ new Map();
  const recent = [];
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
          path: page.path
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
  const monthNames = Array.from(
    { length: 12 },
    (_, index) => monthShortForLanguage(year, index + 1, 1, language)
  );
  root.createEl("h2", {
    text: t("view.dashboard.overview", language, { year })
  });
  const cueActivities = activities.filter((activity) => activity.supportsCues);
  if (cueActivities.length) {
    const cuesP = root.createEl("p");
    cueActivities.forEach((activity, index) => {
      if (index > 0) cuesP.appendText(" \xB7 ");
      const cuesA = cuesP.createEl("a", {
        cls: "fitness-link",
        text: t("view.dashboard.cues", language, { activity: activity.label })
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
      t("view.dashboard.golfFelt", language, feltCounts)
    );
  }
  const hobbyStats = [];
  for (const activity of hobbyActivities(activityTypes)) {
    const items = data.listHobbyItems(activity);
    const entryLists = await Promise.all(
      items.map((item) => data.getHobbyTimeLogEntries(item.path))
    );
    let minutes = 0;
    for (const entries of entryLists) {
      minutes += sumMinutesForYear(entries, year);
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
        text: t("view.dashboard.readingBookshelf", language)
      });
      baseLink.addEventListener("click", (event) => {
        event.preventDefault();
        void data.openPath(READING_BOOKSHELF_REL);
      });
      links.appendText(" \xB7 ");
      const shelfLink = links.createEl("a", {
        cls: "fitness-link",
        text: t("view.dashboard.bookShelf", language)
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
        text: t("view.dashboard.volumeHeader", language, { activity: stat.activity.label })
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
      t("view.dashboard.volumeKg", language)
    ]) {
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
        text: t("view.dashboard.noSetData", language),
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
  }
  if (activities.some((activity) => activity.id === "golf")) {
    root.createEl("h3", { text: t("view.dashboard.golfFocus", language) });
    const focusUl = root.createEl("ul");
    const focuses = sortMapDesc(focusCounts);
    if (!focuses.length) {
      focusUl.createEl("li", {
        text: t("view.dashboard.noFocusTags", language),
        cls: "fitness-muted"
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

// src/util/book-shelf-layout.ts
var DEFAULT_BOOK_WIDTH_PX = 80;
var DEFAULT_BOOK_HEIGHT_PX = 124;
var MIN_BOOK_WIDTH_PX = 56;
var BOOK_GAP_PX = 6;
var ROW_PADDING_PX = 20;
var MIN_BOOKS_PER_ROW = 3;
var DEFAULT_BOOK_SHELF_SCALE = 1;
var MIN_BOOK_SHELF_SCALE = 0.25;
var MAX_BOOK_SHELF_SCALE = 4;
function resolveBookShelfScale(opts) {
  const raw = typeof opts === "string" || opts == null ? opts : opts.scale ?? opts.ratio;
  if (!raw) return DEFAULT_BOOK_SHELF_SCALE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BOOK_SHELF_SCALE;
  return Math.min(MAX_BOOK_SHELF_SCALE, Math.max(MIN_BOOK_SHELF_SCALE, n));
}
function scaledBookSize(scale) {
  const ratio = resolveBookShelfScale(String(scale));
  return {
    maxWidth: Math.max(1, Math.round(DEFAULT_BOOK_WIDTH_PX * ratio)),
    minWidth: Math.max(1, Math.round(MIN_BOOK_WIDTH_PX * ratio))
  };
}
function bookHeightForWidth(width) {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_BOOK_HEIGHT_PX;
  return Math.round(width * DEFAULT_BOOK_HEIGHT_PX / DEFAULT_BOOK_WIDTH_PX);
}
function bookWidthForContainer(containerWidth, gap = BOOK_GAP_PX, padding = ROW_PADDING_PX, minWidth = MIN_BOOK_WIDTH_PX, maxWidth = DEFAULT_BOOK_WIDTH_PX) {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return maxWidth;
  const available = Math.max(0, containerWidth - padding);
  const widthForMinCount = (available - (MIN_BOOKS_PER_ROW - 1) * gap) / MIN_BOOKS_PER_ROW;
  if (widthForMinCount >= maxWidth) return maxWidth;
  if (widthForMinCount >= minWidth) return Math.floor(widthForMinCount);
  return minWidth;
}
function booksPerRow(containerWidth, bookWidth = DEFAULT_BOOK_WIDTH_PX, gap = BOOK_GAP_PX, padding = ROW_PADDING_PX) {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return MIN_BOOKS_PER_ROW;
  }
  const available = Math.max(0, containerWidth - padding);
  const fitted = Math.floor((available + gap) / (bookWidth + gap));
  return Math.max(MIN_BOOKS_PER_ROW, fitted);
}
function chunkItems(items, size) {
  const rowSize = Math.max(1, Math.floor(size));
  if (!items.length) return [[]];
  const rows = [];
  for (let index = 0; index < items.length; index += rowSize) {
    rows.push(items.slice(index, index + rowSize));
  }
  return rows;
}

// src/util/element-width.ts
function measureElementWidth(el, fallbackWidth = 0) {
  let node = el;
  while (node) {
    const client = node.clientWidth;
    if (Number.isFinite(client) && client > 0) return client;
    const rectWidth = node.getBoundingClientRect?.().width;
    if (Number.isFinite(rectWidth) && (rectWidth ?? 0) > 0) return rectWidth ?? 0;
    node = node.parentElement;
  }
  return Number.isFinite(fallbackWidth) && fallbackWidth > 0 ? fallbackWidth : 0;
}

// src/views/book-shelf.ts
var resizeObservers = /* @__PURE__ */ new WeakMap();
var windowListeners = /* @__PURE__ */ new WeakMap();
function setOverflowVisible(el) {
  el.setCssStyles({ overflow: "visible" });
}
function shouldUnclipBookShelfAncestor(className) {
  return className.split(/\s+/).some((token) => {
    const t2 = token.toLowerCase();
    return t2.includes("code-block") || t2.includes("codeblock") || t2 === "cm-embed-block" || t2.includes("internal-embed");
  });
}
function isBookShelfUnclipStop(className) {
  const t2 = className.toLowerCase();
  return t2.includes("markdown-preview-view") || t2.includes("markdown-source-view") || t2.includes("cm-scroller") || t2.includes("workspace-leaf");
}
function unclipBookShelfAncestors(el, maxDepth = 8) {
  let current = el;
  let depth = 0;
  let reachedKnownWrapper = false;
  while (current && depth < maxDepth) {
    const className = current.className ?? "";
    if (isBookShelfUnclipStop(className)) break;
    const knownWrapper = shouldUnclipBookShelfAncestor(className);
    if (depth === 0 || !reachedKnownWrapper || knownWrapper) {
      setOverflowVisible(current);
    }
    if (knownWrapper) reachedKnownWrapper = true;
    current = current.parentElement;
    depth += 1;
  }
}
function bookDetailFixedPosition(args) {
  const gap = args.gap ?? 8;
  return {
    left: args.bookLeft + args.bookWidth / 2,
    top: args.bookTop - gap
  };
}
var activeDetailHides = /* @__PURE__ */ new Set();
function hideAllPortedDetails() {
  for (const hide of [...activeDetailHides]) hide();
}
function bindBookDetailPortal(button, detail) {
  const doc = button.ownerDocument;
  let ported = false;
  const place = () => {
    if (!ported) return;
    if (!button.isConnected) {
      hide();
      return;
    }
    const rect = button.getBoundingClientRect();
    const pos = bookDetailFixedPosition({
      bookTop: rect.top,
      bookLeft: rect.left,
      bookWidth: rect.width
    });
    detail.setCssStyles({
      left: `${pos.left}px`,
      top: `${pos.top}px`
    });
  };
  const hide = () => {
    if (!ported) return;
    ported = false;
    activeDetailHides.delete(hide);
    doc.removeEventListener("scroll", place, true);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", place);
    }
    detail.classList.remove("is-ported");
    detail.setCssStyles({ left: "", top: "" });
    if (button.isConnected) button.appendChild(detail);
    else detail.remove();
  };
  const show = () => {
    const body = doc.body;
    if (!body) return;
    if (ported) {
      place();
      return;
    }
    hideAllPortedDetails();
    ported = true;
    activeDetailHides.add(hide);
    detail.classList.add("is-ported");
    body.appendChild(detail);
    place();
    doc.addEventListener("scroll", place, true);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", place);
    }
  };
  button.addEventListener("pointerenter", show);
  button.addEventListener("pointerleave", hide);
  button.addEventListener("focus", show);
  button.addEventListener("blur", hide);
  return { show, hide };
}
function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function asStringList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  const single = asString(value);
  return single ? [single] : [];
}
function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value) || /^#[0-9a-fA-F]{3}$/.test(value);
}
function shelfColorFor(item) {
  const explicit = asString(item.spine_color);
  if (isValidHexColor(explicit)) return explicit;
  const source = `${item.title}
${item.path}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = hash * 31 + source.charCodeAt(index) >>> 0;
  }
  const color = hash & 16777215 | 3158064;
  return `#${color.toString(16).padStart(6, "0").slice(-6)}`;
}
function buildBookShelfItems(files, activityId = "reading", statusFilter = null) {
  return files.filter(
    (file) => file.frontmatter.type === "atomic-item" && file.frontmatter.activity === activityId
  ).map((file) => {
    const title = asString(file.frontmatter.title) || file.basename;
    const status = asString(file.frontmatter.status) || DEFAULT_READING_STATUS;
    const cover = asString(file.frontmatter.cover);
    const description = asString(file.frontmatter.description);
    return {
      path: file.path,
      title,
      authors: asStringList(file.frontmatter.authors),
      status,
      spineColor: shelfColorFor({
        title,
        path: file.path,
        spine_color: asString(file.frontmatter.spine_color)
      }),
      ...cover ? { cover } : {},
      ...description ? { description } : {}
    };
  }).filter((item) => matchesBookShelfStatus(item.status, statusFilter)).sort(
    (a, b) => statusRank(a.status) - statusRank(b.status) || a.title.localeCompare(b.title) || a.path.localeCompare(b.path)
  );
}
var SAFE_REMOTE_COVER = /^(https?:\/\/|app:\/\/)/i;
var SAFE_RASTER_DATA_COVER = /^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i;
function parseCoverRef(raw) {
  const value = raw.trim();
  if (!value) return { kind: "none" };
  if (/^(javascript|vbscript|data):/i.test(value)) {
    if (SAFE_RASTER_DATA_COVER.test(value)) return { kind: "url", src: value };
    return { kind: "none" };
  }
  if (SAFE_REMOTE_COVER.test(value)) {
    return { kind: "url", src: value };
  }
  let path = value;
  const wiki = value.match(/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/);
  if (wiki) path = wiki[1].trim();
  path = path.replace(/^\.\//, "").trim();
  if (!path) return { kind: "none" };
  return { kind: "vault", path };
}
function resolveCoverSrc(cover, data, sourcePath) {
  const ref = parseCoverRef(cover ?? "");
  if (ref.kind === "none") return null;
  if (ref.kind === "url") return ref.src;
  return data.resolveResourcePath(ref.path, sourcePath);
}
var COVER_SPINE_WIDE_RATIO = 0.72;
function coverObjectPosition(naturalWidth, naturalHeight) {
  if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) {
    return "center";
  }
  return naturalWidth / naturalHeight > COVER_SPINE_WIDE_RATIO ? "right center" : "center";
}
function bindCoverObjectPosition(img) {
  const apply = () => {
    img.style.objectPosition = coverObjectPosition(
      img.naturalWidth,
      img.naturalHeight
    );
  };
  if (img.complete) apply();
  else img.addEventListener("load", apply, { once: true });
}
var COVER_OPEN_CLASS = "is-cover-open";
function hoverFinePointer(media) {
  return Boolean(media?.matches);
}
function bookClickOpensNote(options) {
  return options.hoverFine || options.coverOpen;
}
function hoverFineMedia() {
  if (typeof matchMedia !== "function") return null;
  return matchMedia("(hover: hover) and (pointer: fine)");
}
function closeOpenCovers(root) {
  root.querySelectorAll(`.atomic-book.${COVER_OPEN_CLASS}`).forEach((el) => {
    el.classList.remove(COVER_OPEN_CLASS);
  });
}
function titleLengthClass(title) {
  const length = title.trim().length;
  if (length > 36) return "is-title-xs";
  if (length > 22) return "is-title-sm";
  return "";
}
function createBook(parent, item, data, language) {
  const button = parent.createEl("button", {
    cls: "atomic-book",
    attr: {
      type: "button",
      "data-testid": "atomic-book",
      "data-title": item.title,
      "data-status": item.status,
      "aria-label": t("view.bookShelf.open", language, { title: item.title })
    }
  });
  button.style.setProperty("--atomic-book-color", item.spineColor);
  const titleClass = titleLengthClass(item.title);
  const volume = button.createDiv({ cls: "atomic-book-volume" });
  const pages = volume.createDiv({ cls: "atomic-book-pages" });
  pages.createDiv({
    cls: ["atomic-book-page-title", titleClass].filter(Boolean).join(" "),
    text: item.title
  });
  pages.createDiv({
    cls: "atomic-book-page-author",
    text: item.authors[0] || item.status
  });
  const cover = volume.createDiv({ cls: "atomic-book-cover" });
  const face = cover.createDiv({ cls: "atomic-book-cover-face" });
  const coverSrc = resolveCoverSrc(item.cover, data, item.path);
  if (coverSrc) {
    const img = face.createEl("img", {
      cls: "atomic-book-cover-image",
      attr: { src: coverSrc, alt: "" }
    });
    bindCoverObjectPosition(img);
  } else {
    face.createDiv({
      cls: ["atomic-book-cover-title", titleClass].filter(Boolean).join(" "),
      text: item.title
    });
  }
  cover.createDiv({ cls: "atomic-book-cover-inside" });
  cover.createDiv({ cls: "atomic-book-cover-sleeve" });
  const spine = volume.createDiv({ cls: "atomic-book-spine" });
  spine.createDiv({
    cls: ["atomic-book-spine-title", titleClass].filter(Boolean).join(" "),
    text: item.title
  });
  const detail = button.createDiv({ cls: "atomic-book-detail" });
  detail.createDiv({ cls: "atomic-book-detail-title", text: item.title });
  detail.createDiv({
    cls: "atomic-book-detail-author",
    text: item.authors.join(", ") || item.status
  });
  if (item.description) {
    detail.createDiv({
      cls: "atomic-book-detail-description",
      text: item.description
    });
  }
  const portal = bindBookDetailPortal(button, detail);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const hoverFine = hoverFinePointer(hoverFineMedia());
    const coverOpen = button.classList.contains(COVER_OPEN_CLASS);
    if (!bookClickOpensNote({ hoverFine, coverOpen })) {
      const shelf = parent.closest(".atomic-book-shelf") ?? parent;
      closeOpenCovers(shelf);
      button.classList.add(COVER_OPEN_CLASS);
      portal.show();
      return;
    }
    portal.hide();
    void data.openPath(item.path);
  });
}
function paintRows(frame, items, perRow, data, language, emptyText) {
  hideAllPortedDetails();
  frame.empty();
  const rows = items.length ? chunkItems(items, perRow) : [[]];
  for (const rowItems of rows) {
    const row = frame.createDiv({ cls: "atomic-book-shelf-row" });
    const books = row.createDiv({ cls: "atomic-book-row-books" });
    if (!rowItems.length) {
      books.createDiv({
        cls: "atomic-book-empty",
        text: emptyText
      });
    } else {
      for (const item of rowItems) createBook(books, item, data, language);
    }
    row.createDiv({ cls: "atomic-book-shelf-plank" });
  }
}
function applyBookSize(frame, bookWidth) {
  const height = bookHeightForWidth(bookWidth);
  frame.style.setProperty("--atomic-book-width", `${bookWidth}px`);
  frame.style.setProperty("--atomic-book-height", `${height}px`);
}
function renderBookShelf(el, data, activityTypes, options, language) {
  resizeObservers.get(el)?.disconnect();
  resizeObservers.delete(el);
  const previousWindowListener = windowListeners.get(el);
  if (previousWindowListener) {
    window.removeEventListener("resize", previousWindowListener);
    windowListeners.delete(el);
  }
  hideAllPortedDetails();
  el.empty();
  unclipBookShelfAncestors(el);
  const scale = resolveBookShelfScale(options);
  const { maxWidth, minWidth } = scaledBookSize(scale);
  const root = el.createDiv({
    cls: "fitness-plugin atomic-book-shelf",
    attr: {
      "data-testid": "atomic-bookshelf",
      "data-scale": String(scale)
    }
  });
  const activityId = options.activity?.trim() || "reading";
  const activity = hobbyActivities(activityTypes).find(
    (candidate) => candidate.id === activityId
  );
  if (!activity) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.noActivity", language, { activity: activityId })
    });
    return;
  }
  const { statuses, invalidStatuses } = resolveBookShelfStatuses(options.status);
  if (invalidStatuses.length > 0) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.bookShelf.invalidStatuses", language, {
        statuses: invalidStatuses.join(", ")
      })
    });
  }
  const items = buildBookShelfItems(
    data.listHobbyItems(activity),
    activityId,
    statuses
  );
  const emptyText = statuses && statuses.length > 0 ? t("view.bookShelf.emptyFiltered", language, {
    statuses: statuses.join(", ")
  }) : t("view.bookShelf.empty", language);
  const frame = root.createDiv({ cls: "atomic-book-shelf-frame" });
  let lastKey = "";
  const layout = () => {
    const fallback = typeof window !== "undefined" && Number.isFinite(window.innerWidth) ? window.innerWidth : DEFAULT_BOOK_WIDTH_PX * 3 + BOOK_GAP_PX * 2 + ROW_PADDING_PX;
    const width = measureElementWidth(frame, fallback);
    const bookWidth = bookWidthForContainer(
      width,
      BOOK_GAP_PX,
      ROW_PADDING_PX,
      minWidth,
      maxWidth
    );
    const perRow = booksPerRow(width, bookWidth);
    const key = `${bookWidth}:${perRow}`;
    if (key === lastKey && frame.childElementCount > 0) return;
    lastKey = key;
    applyBookSize(frame, bookWidth);
    paintRows(frame, items, perRow, data, language, emptyText);
  };
  layout();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(layout);
  });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => layout());
    observer.observe(frame);
    resizeObservers.set(el, observer);
    return;
  }
  const onWindowResize = () => {
    if (!el.isConnected) {
      window.removeEventListener("resize", onWindowResize);
      windowListeners.delete(el);
      return;
    }
    layout();
  };
  window.addEventListener("resize", onWindowResize);
  windowListeners.set(el, onWindowResize);
}

// src/util/heatmap-activities.ts
function enabledActivities(activityTypes) {
  return [...exerciseActivities(activityTypes), ...hobbyActivities(activityTypes)];
}
function parseActivityTokens(activityOption) {
  if (activityOption == null) return ["all"];
  return activityOption.split(",").map((token) => token.trim()).filter((token) => token.length > 0);
}
function resolveHeatmapActivities(activityTypes, activityOption) {
  const enabled = enabledActivities(activityTypes);
  const tokens = parseActivityTokens(activityOption);
  if (tokens.length === 0 || tokens.some((token) => token.toLowerCase() === "all")) {
    return { activities: enabled, invalidIds: [] };
  }
  const byId = new Map(
    activityTypes.map((activity) => [activity.id.toLowerCase(), activity])
  );
  const activities = [];
  const invalidIds = [];
  const seen = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const activity = byId.get(key);
    if (!activity || activity.enabled === false) {
      invalidIds.push(token);
      continue;
    }
    const isRenderable = activity.domain === "exercise" && activity.noteModel === "dailySession" || activity.domain === "hobby" && activity.noteModel === "item" && activity.supportsTimer;
    if (!isRenderable) {
      invalidIds.push(token);
      continue;
    }
    activities.push(activity);
  }
  return { activities, invalidIds };
}

// src/util/heatmap-layout.ts
var DEFAULT_ROWS = 1;
var DEFAULT_COLUMNS = 1;
var DEFAULT_MIN_COLUMN_WIDTH = 300;
var DEFAULT_DEFAULT_SPAN = 1.2;
var HEATMAP_GRID_GAP_PX = 12;
function parsePositiveNumber(value, defaultValue) {
  if (!value) return defaultValue;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return n;
}
function parsePositiveInt(value, defaultValue) {
  const n = parsePositiveNumber(value, defaultValue);
  return Math.max(1, Math.floor(n));
}
function resolveHeatmapLayout(opts) {
  return {
    rows: parsePositiveInt(opts.rows, DEFAULT_ROWS),
    columns: parsePositiveInt(opts.columns, DEFAULT_COLUMNS),
    minColumnWidth: parsePositiveInt(
      opts["min-column-width"],
      DEFAULT_MIN_COLUMN_WIDTH
    ),
    defaultSpan: parsePositiveNumber(
      opts["default-span"],
      DEFAULT_DEFAULT_SPAN
    )
  };
}
function effectiveHeatmapColumns(params) {
  const {
    columns,
    minColumnWidth,
    containerWidth,
    activityCount,
    gridGap = HEATMAP_GRID_GAP_PX
  } = params;
  if (activityCount <= 0) return 1;
  const widthBased = Math.max(
    1,
    Math.floor((containerWidth + gridGap) / (minColumnWidth + gridGap))
  );
  return Math.min(columns, activityCount, widthBased);
}

// src/util/heatmap-model.ts
function formatHeatmapTooltip(template, date, minutes) {
  return template.split("{date}").join(date).split("{minutes}").join(String(minutes));
}
function heatmapLayoutKey(layout) {
  return `${layout.rows}:${layout.columns}:${layout.minColumnWidth}:${layout.defaultSpan}`;
}
function heatmapActivityKey(activities) {
  return activities.map((activity) => `${activity.id}\0${activity.label}\0${activity.colors.join(",")}`).join("|");
}
function sameHeatmapPaintState(previous, next) {
  if (!previous) return false;
  return previous.year === next.year && previous.timezone === next.timezone && previous.language === next.language && previous.layoutKey === next.layoutKey && previous.activityKey === next.activityKey && previous.invalidIds.length === next.invalidIds.length && previous.invalidIds.every((id, i) => id === next.invalidIds[i]) && previous.maps.length === next.maps.length && previous.maps.every((map, i) => map === next.maps[i]);
}
function heatmapDomIsPainted(el) {
  return !!el.querySelector(
    '[data-testid="atomic-heatmap"], [data-testid="atomic-heatmap-empty"], [data-testid="atomic-heatmap-invalid"]'
  );
}
function buildHeatmapWeeks(params) {
  const { year, todayStr, language, activityMap } = params;
  const start = { y: year, m: 1, d: 1 };
  const end = { y: year, m: 12, d: 31 };
  const daysToSubtract = weekdaySun0(start.y, start.m, start.d);
  let cursor = addDays(start.y, start.m, start.d, -daysToSubtract);
  const weeks = [];
  let weekCount = 0;
  const endYmd = formatYmd(end.y, end.m, end.d);
  while (weekCount < 60) {
    if (formatYmd(cursor.y, cursor.m, cursor.d) > endYmd) break;
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
        fullDate: fullDateForLanguage(cursor.y, cursor.m, cursor.d, language),
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
  return weeks;
}
function appendHeatmapWeeks(parent, weeks, colors, tooltip, tooltipOpen) {
  for (const week of weeks) {
    const isTodayWeek = week.some((day) => day.isToday && day.isCurrentYear);
    const weekEl = parent.createDiv({
      cls: isTodayWeek ? "fitness-week is-today-week" : "fitness-week"
    });
    for (const day of week) {
      const attr = {
        "data-testid": day.isToday ? "atomic-heatmap-today" : "atomic-heatmap-cell",
        "data-minutes": String(day.minutes),
        "data-date": day.fullDate,
        title: formatHeatmapTooltip(
          day.path ? tooltipOpen : tooltip,
          day.fullDate,
          day.minutes
        )
      };
      if (day.path) attr["data-path"] = day.path;
      const cell = weekEl.createDiv({ cls: cellClass(day), attr });
      cell.style.backgroundColor = day.isCurrentYear ? colorForLevel(colors, day.level) : EMPTY_CELL;
    }
  }
  parent.createDiv({ cls: "fitness-weeks-end-pad" });
}
function colorForLevel(colors, level) {
  if (!level) return EMPTY_CELL;
  return colors[level - 1] || colors[colors.length - 1] || EMPTY_CELL;
}
function cellClass(day) {
  let cls = "fitness-cell";
  if (day.isToday) cls += " is-today";
  if (!day.isCurrentYear) cls += " is-faded";
  if (day.path) cls += " is-link";
  return cls;
}

// src/util/heatmap-scroll.ts
function scrollLeftToAlignRight(scrollWidth, clientWidth, targetRightPx) {
  if (!Number.isFinite(scrollWidth) || !Number.isFinite(clientWidth) || !Number.isFinite(targetRightPx) || scrollWidth < 0 || clientWidth < 0) {
    return 0;
  }
  if (scrollWidth <= clientWidth) {
    return 0;
  }
  const maxScrollLeft = scrollWidth - clientWidth;
  const desired = targetRightPx - clientWidth;
  return Math.min(Math.max(desired, 0), maxScrollLeft);
}

// src/views/heatmap.ts
var heatmapObserverRegistry = /* @__PURE__ */ new WeakMap();
var heatmapPaintState = /* @__PURE__ */ new WeakMap();
function cleanupHeatmapObservers(container) {
  const registry = heatmapObserverRegistry.get(container);
  if (!registry) return;
  for (const observer of registry.scrolls) observer.disconnect();
  registry.grid?.disconnect();
  heatmapObserverRegistry.delete(container);
}
var DAY_NAMES = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  "zh-Hant-en": ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"]
};
function wireHeatmapScroll(scrollEl, registry) {
  let userHasScrolled = false;
  let expectedScrollLeft = null;
  const applyTodayAlign = () => {
    const todayWeek = scrollEl.querySelector(".is-today-week");
    if (!todayWeek) return;
    const targetRightPx = todayWeek.getBoundingClientRect().right - scrollEl.getBoundingClientRect().left + scrollEl.scrollLeft;
    const nextScrollLeft = scrollLeftToAlignRight(
      scrollEl.scrollWidth,
      scrollEl.clientWidth,
      targetRightPx
    );
    expectedScrollLeft = nextScrollLeft;
    scrollEl.scrollLeft = nextScrollLeft;
  };
  scrollEl.addEventListener(
    "scroll",
    () => {
      if (expectedScrollLeft !== null && Math.abs(scrollEl.scrollLeft - expectedScrollLeft) < 1) {
        expectedScrollLeft = null;
        return;
      }
      userHasScrolled = true;
    },
    { passive: true }
  );
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      if (userHasScrolled) return;
      window.requestAnimationFrame(() => {
        if (!userHasScrolled) applyTodayAlign();
      });
    });
    resizeObserver.observe(scrollEl);
    registry.scrolls.push(resizeObserver);
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!userHasScrolled) applyTodayAlign();
    });
  });
}
function wireHeatmapCellClicks(weeksEl, data) {
  weeksEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const cell = target.closest(".fitness-cell.is-link");
    const path = cell?.getAttribute("data-path");
    if (!path) return;
    event.preventDefault();
    void data.openPath(path);
  });
}
function renderOneHeatmap(root, data, activity, year, timezone, language, registry, activityMap) {
  const wrap = root.createDiv({
    cls: "fitness-heatmap",
    attr: {
      "data-testid": "atomic-heatmap",
      "data-activity": activity.id
    }
  });
  wrap.createEl("h4", { cls: "fitness-heatmap-title", text: activity.label });
  const legend = wrap.createDiv({ cls: "fitness-heatmap-legend" });
  legend.createSpan({ text: t("view.heatmap.less", language) });
  legend.createDiv({ cls: "fitness-legend-swatch" }).style.background = EMPTY_CELL;
  for (const c of activity.colors) {
    const sw = legend.createDiv({ cls: "fitness-legend-swatch" });
    sw.style.background = c;
  }
  legend.createSpan({ text: t("view.heatmap.more", language) });
  legend.createSpan({
    text: t("view.heatmap.byDuration", language),
    attr: { style: "margin-left:8px" }
  });
  const weeks = buildHeatmapWeeks({
    year,
    todayStr: ymdInZone(/* @__PURE__ */ new Date(), timezone),
    language,
    activityMap
  });
  const body = wrap.createDiv({ cls: "fitness-heatmap-body" });
  const dayLabels = body.createDiv({ cls: "fitness-day-labels" });
  for (const d of DAY_NAMES[language]) {
    dayLabels.createDiv({ cls: "fitness-day-label", text: d });
  }
  const scroll = body.createDiv({ cls: "fitness-heatmap-scroll" });
  const monthRow = scroll.createDiv({ cls: "fitness-month-row" });
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
  const weeksEl = scroll.createDiv({ cls: "fitness-weeks" });
  appendHeatmapWeeks(
    weeksEl,
    weeks,
    activity.colors,
    t("view.heatmap.tooltip", language),
    t("view.heatmap.tooltipOpen", language)
  );
  wireHeatmapCellClicks(weeksEl, data);
  wireHeatmapScroll(scroll, registry);
}
function wireHeatmapGrid(gridEl, layout, activityCount, registry) {
  gridEl.style.gridTemplateRows = `repeat(${layout.rows}, auto)`;
  const applyColumns = () => {
    const fallback = typeof window !== "undefined" && Number.isFinite(window.innerWidth) ? window.innerWidth : layout.minColumnWidth;
    const columnCount = effectiveHeatmapColumns({
      columns: layout.columns,
      minColumnWidth: layout.minColumnWidth,
      containerWidth: measureElementWidth(gridEl, fallback),
      activityCount
    });
    gridEl.style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, ${layout.defaultSpan}fr))`;
  };
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(applyColumns);
    });
    resizeObserver.observe(gridEl);
    registry.grid = resizeObserver;
  }
  applyColumns();
}
async function renderHeatmaps(el, data, activityTypes, year, timezone, language, activityOption, layoutOptions) {
  const layout = resolveHeatmapLayout(layoutOptions ?? {});
  const { activities, invalidIds } = resolveHeatmapActivities(
    activityTypes,
    activityOption
  );
  const maps = await Promise.all(
    activities.map((activity) => data.getActivityDurationMap(activity, year))
  );
  const paintState = {
    year,
    timezone,
    language,
    layoutKey: heatmapLayoutKey(layout),
    activityKey: heatmapActivityKey(activities),
    invalidIds,
    maps
  };
  if (heatmapDomIsPainted(el) && sameHeatmapPaintState(heatmapPaintState.get(el), paintState)) {
    return;
  }
  cleanupHeatmapObservers(el);
  el.empty();
  heatmapPaintState.set(el, paintState);
  const registry = { scrolls: [] };
  heatmapObserverRegistry.set(el, registry);
  const root = el.createDiv({ cls: "fitness-plugin" });
  if (invalidIds.length > 0) {
    root.createEl("p", {
      text: t("view.heatmap.invalidActivities", language, {
        ids: invalidIds.join(", ")
      }),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-invalid" }
    });
  }
  if (activities.length === 0 && invalidIds.length === 0) {
    root.createEl("p", {
      text: t("view.heatmap.noActivities", language),
      cls: "fitness-muted",
      attr: { "data-testid": "atomic-heatmap-empty" }
    });
    return;
  }
  const useGrid = activities.length > 1 && layout.columns > 1;
  const heatmapParent = useGrid ? root.createDiv({ cls: "fitness-heatmap-grid" }) : root;
  for (let i = 0; i < activities.length; i++) {
    renderOneHeatmap(
      heatmapParent,
      data,
      activities[i],
      year,
      timezone,
      language,
      registry,
      maps[i]
    );
  }
  if (useGrid) {
    wireHeatmapGrid(heatmapParent, layout, activities.length, registry);
  }
}
function resolveHeatmapYear(opts, sourcePath, timezone) {
  if (opts.year && Number(opts.year)) return Number(opts.year);
  const fromPath = parseYmd(
    sourcePath.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || ""
  );
  if (fromPath) return fromPath.y;
  return Number(ymdInZone(/* @__PURE__ */ new Date(), timezone).slice(0, 4));
}

// src/views/gym-log.ts
var import_obsidian4 = require("obsidian");

// src/core/gym-log.ts
var NEW_EXERCISE_SENTINEL = "__atomic_new_exercise__";
var CUSTOM_MUSCLE_SENTINEL = "__atomic_custom_muscle__";
var GYM_LOG_FENCE_RE = /```atomic-gym-log\b/;
var SET_TABLE_ALIGN_RE = /^:?-{1,}:?$/;
var DAILY_SESSION_FILE_RE = /\d{4}-\d{2}-\d{2}\.md$/i;
var DEFAULT_SET_TABLE_HEADERS = {
  exercise: "Exercise",
  muscle: "Muscle",
  weight: "Weight",
  reps: "Reps",
  notes: "Notes"
};
function isGymLogSetup(value) {
  return value === "pending" || value === "complete" || value === "skipped";
}
function gymExercisePairKey(pair) {
  return `${normalizePairPart(pair.exercise)}\0${normalizePairPart(pair.muscle)}`;
}
function gymExercisePairLabel(pair) {
  return `${pair.exercise} \xB7 ${pair.muscle}`;
}
function parseGymExercisePairValue(value) {
  if (!value || value === NEW_EXERCISE_SENTINEL) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 2) return null;
    const exercise = String(parsed[0] ?? "").trim();
    const muscle = String(parsed[1] ?? "").trim();
    if (!exercise || !muscle) return null;
    return { exercise, muscle };
  } catch {
    return null;
  }
}
function gymExercisePairValue(pair) {
  return JSON.stringify([pair.exercise, pair.muscle]);
}
function normalizeGymExercisePair(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value;
  const exercise = String(record.exercise ?? "").trim();
  const muscle = String(record.muscle ?? "").trim();
  if (!exercise || !muscle) return null;
  return { exercise, muscle };
}
function normalizeGymExercises(value) {
  if (!Array.isArray(value)) return [];
  return mergeGymExercises([], value);
}
function mergeGymExercises(existing, incoming) {
  const byKey = /* @__PURE__ */ new Map();
  for (const value of [...existing, ...incoming]) {
    const pair = normalizeGymExercisePair(value);
    if (!pair) continue;
    const key = gymExercisePairKey(pair);
    if (!byKey.has(key)) byKey.set(key, pair);
  }
  return [...byKey.values()].sort((a, b) => {
    const exercise = a.exercise.localeCompare(b.exercise);
    if (exercise !== 0) return exercise;
    return a.muscle.localeCompare(b.muscle);
  });
}
function extractExercisePairs(markdown) {
  return mergeGymExercises([], pairsFromSetTable(markdown));
}
function hasGymLogBlock(markdown) {
  return GYM_LOG_FENCE_RE.test(String(markdown || ""));
}
function isGymLogMigrationTarget(path) {
  const base = String(path || "").split("/").pop() ?? "";
  if (!base.toLowerCase().endsWith(".md")) return false;
  if (/^cues\.md$/i.test(base)) return false;
  return true;
}
function isDailySessionPath(path) {
  return DAILY_SESSION_FILE_RE.test(String(path || ""));
}
function sanitizeSetTableCell(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}
function formatSetTableRow(row, columnCount = 5) {
  const cells = [
    sanitizeSetTableCell(row.exercise),
    sanitizeSetTableCell(row.muscle),
    sanitizeSetTableCell(row.weight),
    sanitizeSetTableCell(row.reps),
    sanitizeSetTableCell(row.notes)
  ];
  while (cells.length < columnCount) cells.push("");
  return `| ${cells.slice(0, columnCount).join(" | ")} |`;
}
function emptySetTable(headers = DEFAULT_SET_TABLE_HEADERS) {
  return [
    `| ${headers.exercise} | ${headers.muscle} | ${headers.weight} | ${headers.reps} | ${headers.notes} |`,
    "| --- | --- | --- | --- | --- |",
    ""
  ].join("\n");
}
function appendSetRow(markdown, row, headers = DEFAULT_SET_TABLE_HEADERS) {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  const formatted = formatSetTableRow(row, table?.columnCount ?? 5);
  if (!table) {
    const suffix = `${ensureTrailingNewline2(markdown).replace(/\n+$/, "\n\n")}${emptySetTable(headers)}${formatted}
`;
    return { markdown: suffix, filledEmpty: false };
  }
  for (let i = table.firstData; i <= table.end; i += 1) {
    if (isEmptySetTableRow(parsePipeCells(lines[i] ?? ""))) {
      lines[i] = formatted;
      return { markdown: lines.join("\n"), filledEmpty: true };
    }
  }
  lines.splice(table.end + 1, 0, formatted);
  return { markdown: lines.join("\n"), filledEmpty: false };
}
function insertGymLogFence(markdown, fence, headers = DEFAULT_SET_TABLE_HEADERS) {
  const source = String(markdown || "");
  if (hasGymLogBlock(source)) return { markdown: source, changed: false };
  const lines = source.split(/\r?\n/);
  const table = findSetTableRange(lines);
  const block = String(fence || "").trim();
  if (!block) return { markdown: source, changed: false };
  if (table) {
    const prefix2 = lines.slice(0, table.header).join("\n").replace(/\s+$/, "");
    const rest = lines.slice(table.header).join("\n");
    return {
      markdown: withSingleTrailingNewline(joinMarkdownSeams([prefix2, block, rest])),
      changed: true
    };
  }
  const prefix = source.replace(/\n+$/, "");
  const tableMarkdown = emptySetTable(headers).replace(/\n+$/, "");
  return {
    markdown: withSingleTrailingNewline(
      joinMarkdownSeams([prefix, block, tableMarkdown])
    ),
    changed: true
  };
}
function planGymLogSetup(files, fence, headers = DEFAULT_SET_TABLE_HEADERS) {
  const notes = [];
  let pairs = [];
  for (const file of files) {
    if (!isGymLogMigrationTarget(file.path)) continue;
    const markdown = String(file.markdown || "");
    pairs = mergeGymExercises(pairs, extractExercisePairs(markdown));
    const shouldRewrite = isDailySessionPath(file.path) || hasSetTableHeader(markdown);
    if (!shouldRewrite) continue;
    const next = insertGymLogFence(markdown, fence, headers);
    if (next.changed) {
      notes.push({ path: file.path, nextMarkdown: next.markdown });
    }
  }
  return { pairs, notes };
}
function normalizePairPart(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function ensureTrailingNewline2(markdown) {
  const source = String(markdown || "");
  return source.endsWith("\n") ? source : `${source}
`;
}
function withSingleTrailingNewline(markdown) {
  return `${String(markdown || "").replace(/\n+$/, "")}
`;
}
function joinMarkdownSeams(parts) {
  return parts.filter((part) => part.length > 0).join("\n\n");
}
function parsePipeCells(line) {
  if (!line.trim().startsWith("|")) return [];
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}
function isSetTableHeader(cells) {
  const joined = cells.join(" ").toLowerCase();
  return joined.includes("exercise") && joined.includes("muscle");
}
function isAlignmentRow(cells) {
  return cells.length > 0 && cells.every((cell) => SET_TABLE_ALIGN_RE.test(cell));
}
function isEmptySetTableRow(cells) {
  return cells.length > 0 && cells.every((cell) => cell === "");
}
function hasSetTableHeader(markdown) {
  return findSetTableRange(String(markdown || "").split(/\r?\n/)) !== null;
}
function findSetTableRange(lines) {
  let header = -1;
  let columnCount = 5;
  for (let i = 0; i < lines.length; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (!isSetTableHeader(cells)) continue;
    header = i;
    columnCount = cells.length;
    break;
  }
  if (header < 0) return null;
  let firstData = header + 1;
  while (firstData < lines.length && isAlignmentRow(parsePipeCells(lines[firstData] ?? ""))) {
    firstData += 1;
  }
  let end = firstData - 1;
  for (let i = firstData; i < lines.length; i += 1) {
    if (!String(lines[i] ?? "").trim().startsWith("|")) break;
    end = i;
  }
  return { header, firstData, end, columnCount };
}
function pairsFromSetTable(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const table = findSetTableRange(lines);
  if (!table) return [];
  const pairs = [];
  for (let i = table.firstData; i <= table.end; i += 1) {
    const cells = parsePipeCells(lines[i] ?? "");
    if (isAlignmentRow(cells) || isEmptySetTableRow(cells)) continue;
    const exercise = cells[0] || "";
    const muscle = cells[1] || "";
    if (!exercise || !muscle) continue;
    pairs.push({ exercise, muscle });
  }
  return pairs;
}

// src/commands/gym-log-setup.ts
var import_obsidian3 = require("obsidian");
function gymSetTableHeaders(language) {
  return {
    exercise: t("template.gymTable.exercise", language),
    muscle: t("template.gymTable.muscle", language),
    weight: t("template.gymTable.weight", language),
    reps: t("template.gymTable.reps", language),
    notes: t("template.gymTable.notes", language)
  };
}
function muscleLabel(muscle, language) {
  const key = `muscle.${muscle}`;
  const translated = t(key, language);
  return translated === key ? muscle : translated;
}
async function applyGymLogSetup(plugin) {
  const language = plugin.settings.language;
  const fence = defaultAtomicBlockFence("atomic-gym-log", language);
  const headers = gymSetTableHeaders(language);
  const paths = [];
  for (const activity of plugin.settings.activityTypes) {
    if (!activity.supportsSetTable) continue;
    for (const file of plugin.data.listMarkdownInFolder(activity.folder)) {
      if (!isGymLogMigrationTarget(file.path)) continue;
      paths.push(file.path);
    }
  }
  const files = await Promise.all(
    paths.map(async (path) => ({
      path,
      markdown: await plugin.data.readBody(path)
    }))
  );
  const plan = planGymLogSetup(files, fence, headers);
  await Promise.all(
    plan.notes.map(
      (note) => plugin.data.processNote(note.path, (current) => {
        const latest = insertGymLogFence(current, fence, headers);
        return latest.changed ? latest.markdown : current;
      })
    )
  );
  plugin.settings.gymExercises = mergeGymExercises(
    plugin.settings.gymExercises,
    plan.pairs
  );
  plugin.settings.gymLogSetup = "complete";
  await plugin.saveSettings();
  plugin.scheduleRefresh();
  return {
    pairs: plugin.settings.gymExercises.length,
    notes: plan.notes.length
  };
}
async function runGymLogSetup(plugin) {
  const language = plugin.settings.language;
  try {
    const result = await applyGymLogSetup(plugin);
    new import_obsidian3.Notice(
      t("notice.gymLogSetupComplete", language, {
        pairs: result.pairs,
        notes: result.notes
      })
    );
    return true;
  } catch (error) {
    console.error("Gym logger setup failed", error);
    new import_obsidian3.Notice(
      t("notice.gymLogSetupFailed", language, {
        message: error instanceof Error ? error.message : String(error)
      })
    );
    return false;
  }
}
function promptGymLogSetup(plugin) {
  if (plugin.settings.gymLogSetup !== "pending") return;
  new GymLogSetupModal(plugin).open();
}
function promptNewGymExercise(plugin) {
  return new Promise((resolve) => {
    const modal = new NewGymExerciseModal(plugin.app, plugin.settings.language, (pair) => {
      resolve(pair);
    });
    modal.open();
  });
}
var GymLogSetupModal = class extends import_obsidian3.Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
  }
  onOpen() {
    const language = this.plugin.settings.language;
    this.modalEl.setAttr("data-testid", "atomic-gym-log-setup-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: t("modal.gymSetupTitle", language) });
    contentEl.createEl("p", { text: t("modal.gymSetupBody", language) });
    new import_obsidian3.Setting(contentEl).addButton((button) => {
      button.setButtonText(t("modal.gymSetupLater", language));
      button.buttonEl.setAttr("data-testid", "atomic-gym-log-setup-later");
      button.onClick(() => {
        void this.skip();
      });
    }).addButton((button) => {
      button.setButtonText(t("modal.gymSetupConfirm", language));
      button.setCta();
      button.buttonEl.setAttr("data-testid", "atomic-gym-log-setup-confirm");
      button.onClick(() => {
        void this.confirm();
      });
    });
  }
  async skip() {
    this.plugin.settings.gymLogSetup = "skipped";
    await this.plugin.saveSettings();
    new import_obsidian3.Notice(t("notice.gymLogSetupLater", this.plugin.settings.language));
    this.close();
  }
  async confirm() {
    this.close();
    await runGymLogSetup(this.plugin);
  }
};
var NewGymExerciseModal = class extends import_obsidian3.Modal {
  constructor(app, language, onFinish) {
    super(app);
    this.language = language;
    this.onFinish = onFinish;
    this.exercise = "";
    this.muscle = MUSCLES[0] ?? "Chest";
    this.customMuscle = "";
    this.customMuscleRow = null;
    this.resolved = false;
  }
  onOpen() {
    this.modalEl.setAttr("data-testid", "atomic-gym-new-exercise-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: t("modal.gymNewExerciseTitle", this.language) });
    new import_obsidian3.Setting(contentEl).setName(t("modal.gymExerciseName", this.language)).addText((text) => {
      text.inputEl.setAttr("data-testid", "atomic-gym-new-exercise-name");
      text.inputEl.setCssStyles({ width: "100%" });
      text.onChange((value) => {
        this.exercise = value;
      });
      window.setTimeout(() => text.inputEl.focus(), 20);
    });
    new import_obsidian3.Setting(contentEl).setName(t("modal.gymMuscle", this.language)).addDropdown((dropdown) => {
      dropdown.selectEl.setAttr("data-testid", "atomic-gym-new-exercise-muscle");
      for (const muscle of MUSCLES) {
        dropdown.addOption(muscle, muscleLabel(muscle, this.language));
      }
      dropdown.addOption(
        CUSTOM_MUSCLE_SENTINEL,
        t("view.gymLog.customMuscle", this.language)
      );
      dropdown.setValue(this.muscle);
      dropdown.onChange((value) => {
        this.muscle = value;
        this.syncCustomMuscleVisibility();
      });
    });
    const customSetting = new import_obsidian3.Setting(contentEl).setName(t("modal.gymCustomMuscle", this.language)).addText((text) => {
      text.inputEl.setAttr("data-testid", "atomic-gym-new-exercise-muscle-custom");
      text.setValue(this.customMuscle);
      text.onChange((value) => {
        this.customMuscle = value;
      });
    });
    customSetting.settingEl.setAttr(
      "data-testid",
      "atomic-gym-new-exercise-muscle-custom-row"
    );
    this.customMuscleRow = customSetting.settingEl;
    this.syncCustomMuscleVisibility();
    new import_obsidian3.Setting(contentEl).addButton(
      (button) => button.setButtonText(t("modal.cancel", this.language)).onClick(() => this.finish(null))
    ).addButton(
      (button) => button.setButtonText(t("modal.ok", this.language)).setCta().onClick(() => this.submit())
    );
  }
  syncCustomMuscleVisibility() {
    if (!this.customMuscleRow) return;
    this.customMuscleRow.toggleClass(
      "atomic-gym-custom-muscle-hidden",
      this.muscle !== CUSTOM_MUSCLE_SENTINEL
    );
  }
  submit() {
    const exercise = this.exercise.trim();
    if (!exercise) {
      new import_obsidian3.Notice(t("notice.gymLogEmptyExercise", this.language));
      return;
    }
    const muscle = this.muscle === CUSTOM_MUSCLE_SENTINEL ? this.customMuscle.trim() : this.muscle.trim();
    if (!muscle) {
      new import_obsidian3.Notice(t("notice.gymLogEmptyMuscle", this.language));
      return;
    }
    this.finish({ exercise, muscle });
  }
  finish(pair) {
    if (this.resolved) return;
    this.resolved = true;
    this.close();
    this.onFinish(pair);
  }
  onClose() {
    if (this.resolved) return;
    this.resolved = true;
    this.onFinish(null);
  }
};

// src/views/gym-log.ts
var pendingGymLogSelection = /* @__PURE__ */ new Map();
async function renderAtomicGymLog(plugin, el, sourcePath) {
  el.empty();
  const language = plugin.settings.language;
  const root = el.createDiv({
    cls: "fitness-plugin atomic-gym-log",
    attr: { "data-testid": "atomic-gym-log" }
  });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.gymLog.needsSession", language)
    });
    return;
  }
  const catalog = plugin.settings.gymExercises;
  if (!catalog.length) {
    root.createEl("p", {
      cls: "fitness-muted atomic-gym-log-empty",
      text: t("view.gymLog.emptyCatalog", language)
    });
  }
  const form = root.createDiv({ cls: "atomic-gym-log-row" });
  const select = addField(form, t("view.gymLog.exercise", language)).createEl("select", {
    cls: "dropdown",
    attr: {
      "data-testid": "atomic-gym-log-exercise",
      "aria-label": t("view.gymLog.exercise", language)
    }
  });
  select.createEl("option", {
    text: t("view.gymLog.exercise", language),
    value: ""
  });
  for (const pair of catalog) {
    select.createEl("option", {
      text: gymExercisePairLabel(pair),
      value: gymExercisePairValue(pair)
    });
  }
  select.createEl("option", {
    text: t("view.gymLog.newExercise", language),
    value: NEW_EXERCISE_SENTINEL
  });
  if (catalog[0]) select.value = gymExercisePairValue(catalog[0]);
  const pending = pendingGymLogSelection.get(sourcePath);
  if (pending && Array.from(select.options).some((option) => option.value === pending)) {
    select.value = pending;
    pendingGymLogSelection.delete(sourcePath);
  }
  const weightInput = addTextField(
    form,
    t("view.gymLog.weight", language),
    "atomic-gym-log-weight"
  );
  const repsInput = addTextField(
    form,
    t("view.gymLog.reps", language),
    "atomic-gym-log-reps"
  );
  const notesInput = addTextField(
    form,
    t("view.gymLog.notes", language),
    "atomic-gym-log-notes"
  );
  notesInput.setAttr("placeholder", t("view.gymLog.notes", language));
  const actions = form.createDiv({ cls: "atomic-gym-log-field" });
  actions.createEl("label", { text: "\xA0" });
  const addButton = actions.createEl("button", {
    cls: "mod-cta",
    text: t("view.gymLog.add", language),
    attr: { "data-testid": "atomic-gym-log-add" }
  });
  select.addEventListener("change", () => {
    if (select.value !== NEW_EXERCISE_SENTINEL) return;
    void (async () => {
      const created = await promptNewGymExercise(plugin);
      if (!created) {
        select.value = catalog[0] ? gymExercisePairValue(catalog[0]) : "";
        return;
      }
      plugin.settings.gymExercises = mergeGymExercises(plugin.settings.gymExercises, [
        created
      ]);
      await plugin.saveSettings();
      new import_obsidian4.Notice(
        t("notice.gymExerciseSaved", language, {
          exercise: created.exercise,
          muscle: created.muscle
        })
      );
      pendingGymLogSelection.set(sourcePath, gymExercisePairValue(created));
      plugin.scheduleRefresh();
    })();
  });
  addButton.addEventListener("click", () => {
    void (async () => {
      if (addButton.disabled) return;
      const pair = parseGymExercisePairValue(select.value);
      const weight = weightInput.value.trim();
      const reps = repsInput.value.trim();
      const notes = notesInput.value.trim();
      if (!pair || !weight || !reps) {
        new import_obsidian4.Notice(t("notice.gymLogMissingFields", language));
        return;
      }
      const file = plugin.data.getFileByPath(sourcePath);
      if (!file) {
        new import_obsidian4.Notice(t("notice.gymLogNeedsSavedNote", language));
        return;
      }
      const headers = gymSetTableHeaders(language);
      addButton.disabled = true;
      try {
        await plugin.app.vault.process(file, (latest) => {
          return appendSetRow(
            latest,
            {
              exercise: pair.exercise,
              muscle: pair.muscle,
              weight,
              reps,
              notes
            },
            headers
          ).markdown;
        });
        plugin.settings.gymExercises = mergeGymExercises(plugin.settings.gymExercises, [
          pair
        ]);
        await plugin.saveSettings();
        plugin.scheduleRefresh();
        weightInput.value = "";
        repsInput.value = "";
        notesInput.value = "";
        new import_obsidian4.Notice(
          t("notice.gymLogAdded", language, { exercise: pair.exercise })
        );
      } finally {
        addButton.disabled = false;
      }
    })();
  });
}
function addField(parent, label) {
  const field = parent.createDiv({ cls: "atomic-gym-log-field" });
  field.createEl("label", { text: label });
  return field;
}
function addTextField(parent, label, testId) {
  return addField(parent, label).createEl("input", {
    attr: {
      type: "text",
      "data-testid": testId,
      "aria-label": label
    }
  });
}

// src/views/timer.ts
var import_obsidian5 = require("obsidian");
async function modifyCurrentNote(plugin, sourcePath, updater) {
  const file = plugin.data.getFileByPath(sourcePath);
  if (!file) {
    new import_obsidian5.Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
    return;
  }
  await plugin.app.vault.process(file, updater);
  plugin.scheduleRefresh();
}
async function renderAtomicTimer(plugin, el, sourcePath) {
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-timer",
    attr: { "data-testid": "atomic-timer" }
  });
  if (!sourcePath) {
    root.createEl("p", {
      cls: "fitness-muted",
      text: t("view.timer.needsReadingItem", plugin.settings.language)
    });
    return;
  }
  const markdown = await plugin.data.readBody(sourcePath);
  const frontmatter = readTimerFrontmatter(markdown);
  root.createEl("p", {
    text: t("view.timer.total", plugin.settings.language, {
      minutes: frontmatter.totalMin
    }),
    cls: "atomic-timer-total"
  });
  const actions = root.createDiv({ cls: "fitness-actions atomic-timer-actions" });
  if (frontmatter.timerStartedAt) {
    root.createEl("p", {
      cls: "atomic-timer-running",
      text: t("view.timer.runningSince", plugin.settings.language, {
        time: frontmatter.timerStartedAt
      })
    });
    actions.createEl("button", {
      text: t("view.timer.stop", plugin.settings.language),
      attr: { "data-testid": "atomic-timer-stop" }
    }).addEventListener("click", () => {
      void (async () => {
        const file = plugin.data.getFileByPath(sourcePath);
        if (!file) {
          new import_obsidian5.Notice(t("notice.timerNeedsSavedNote", plugin.settings.language));
          return;
        }
        const latest = await plugin.app.vault.read(file);
        const latestFrontmatter = readTimerFrontmatter(latest);
        if (!latestFrontmatter.timerStartedAt) {
          new import_obsidian5.Notice(t("notice.timerNotRunning", plugin.settings.language));
          return;
        }
        const note = await promptText(
          plugin.app,
          t("modal.timeLogNote", plugin.settings.language),
          "",
          plugin.settings.language
        );
        if (note === null) return;
        const result = stopTimer({
          markdown: latest,
          startedAtIso: latestFrontmatter.timerStartedAt,
          stoppedAtIso: (/* @__PURE__ */ new Date()).toISOString(),
          note
        });
        await plugin.app.vault.process(file, () => result.markdown);
        plugin.scheduleRefresh();
        new import_obsidian5.Notice(
          t("notice.timerLogged", plugin.settings.language, {
            minutes: result.minutes
          })
        );
      })();
    });
    actions.createEl("button", {
      text: t("view.timer.resume", plugin.settings.language),
      attr: { "data-testid": "atomic-timer-resume" }
    }).addEventListener("click", () => {
      new import_obsidian5.Notice(t("notice.timerAlreadyRunning", plugin.settings.language));
    });
    actions.createEl("button", {
      text: t("view.timer.discard", plugin.settings.language),
      attr: { "data-testid": "atomic-timer-discard" }
    }).addEventListener("click", () => {
      void modifyCurrentNote(
        plugin,
        sourcePath,
        (latest) => updateTimerFrontmatter(latest, { timerStartedAtIso: null })
      );
    });
    return;
  }
  actions.createEl("button", {
    text: t("view.timer.start", plugin.settings.language),
    attr: { "data-testid": "atomic-timer-start" }
  }).addEventListener("click", () => {
    void modifyCurrentNote(
      plugin,
      sourcePath,
      (latest) => updateTimerFrontmatter(latest, {
        timerStartedAtIso: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  });
}

// src/views/today.ts
function resolveTodayDate(opts, sourcePath, timezone) {
  if (opts.date && parseYmd(opts.date)) return opts.date;
  const fromPath = extractYmdFromPath(sourcePath);
  if (fromPath) return fromPath;
  return ymdInZone(/* @__PURE__ */ new Date(), timezone);
}
function renderTodaySessions(el, data, activityTypes, dateStr, language) {
  el.empty();
  const root = el.createDiv({ cls: "fitness-plugin" });
  const box = root.createDiv();
  box.createEl("strong", { text: t("view.today.title", language) });
  const ul = box.createEl("ul");
  const year = Number(dateStr.slice(0, 4));
  for (const activity of exerciseActivities(activityTypes)) {
    const path = `${activity.folder}/${year}/${dateStr}.md`;
    const li = ul.createEl("li");
    li.appendText(`${activity.label}: `);
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
        text: t("view.today.noSession", language)
      });
    }
  }
}

// src/codeblocks.ts
function frontmatterYear(plugin, sourcePath) {
  const cache = plugin.app.metadataCache.getCache(sourcePath);
  return cache?.frontmatter?.year;
}
var AtomicBlockChild = class extends import_obsidian6.MarkdownRenderChild {
  constructor(containerEl, startRender) {
    super(containerEl);
    this.startRender = startRender;
    this.generation = 0;
  }
  onload() {
    this.startRender();
    this.generation = currentBlockGeneration(this.containerEl);
  }
  onunload() {
    invalidateBlockRenderIfCurrent(this.containerEl, this.generation);
  }
};
function renderTrackedBlock(plugin, block) {
  return enqueueBlockRender(block.el, async (generation) => {
    if (isStaleBlockRender(block.el, generation) || !block.el.isConnected) {
      return;
    }
    await renderBlock(plugin, block.kind, block.source, block.el, {
      sourcePath: block.sourcePath
    });
  });
}
async function renderBlock(plugin, kind, source, el, ctx) {
  if (!el.isConnected) return;
  const opts = parseBlockOptions(source);
  const sourcePath = ctx.sourcePath || "";
  const data = plugin.data;
  const settings = plugin.settings;
  const activityTypes = settings.activityTypes;
  const tz = settings.timezone;
  const language = settings.language;
  try {
    switch (kind) {
      case "atomic-heatmap": {
        const year = resolveHeatmapYear(opts, sourcePath, tz);
        await renderHeatmaps(
          el,
          data,
          activityTypes,
          year,
          tz,
          language,
          opts.activity,
          opts
        );
        break;
      }
      case "atomic-today": {
        const dateStr = resolveTodayDate(opts, sourcePath, tz);
        renderTodaySessions(el, data, activityTypes, dateStr, language);
        break;
      }
      case "atomic-dashboard": {
        const year = resolveDashboardYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz
        );
        await renderDashboard(
          el,
          data,
          activityTypes,
          year,
          language
        );
        break;
      }
      case "atomic-golf-cues":
      case "atomic-gym-cues":
      case "atomic-cues": {
        const activity = resolveCueActivity(kind, opts);
        if (!activity) {
          el.empty();
          const root = el.createDiv({ cls: "fitness-plugin" });
          root.createEl("p", {
            text: t("view.atomicCuesRequiresActivity", language),
            cls: "fitness-muted"
          });
          break;
        }
        const year = resolveCuesYear(
          opts,
          frontmatterYear(plugin, sourcePath),
          tz
        );
        await renderCues(
          el,
          data,
          activityTypes,
          year,
          tz,
          activity,
          language
        );
        break;
      }
      case "atomic-actions": {
        renderActions(el, plugin);
        break;
      }
      case "atomic-timer": {
        await renderAtomicTimer(plugin, el, sourcePath);
        break;
      }
      case "atomic-gym-log": {
        await renderAtomicGymLog(plugin, el, sourcePath);
        break;
      }
      case "atomic-bookshelf": {
        renderBookShelf(el, data, activityTypes, opts, language);
        break;
      }
      default:
        el.empty();
        el.createEl("p", {
          text: t("view.unknownAtomicBlock", language, { kind })
        });
    }
  } catch (err) {
    console.error("Atomic block error", kind, err);
    el.empty();
    el.createEl("p", {
      text: t("view.atomicError", language, {
        message: err instanceof Error ? err.message : String(err)
      }),
      cls: "mod-warning"
    });
  }
}
function registerCodeblocks(plugin) {
  const kinds = codeblockLanguages();
  for (const kind of kinds) {
    plugin.registerMarkdownCodeBlockProcessor(kind, (source, el, ctx) => {
      const block = { kind, el, source, sourcePath: ctx.sourcePath };
      plugin.trackLiveBlock(block);
      mountAtomicBlockShell(el);
      ctx.addChild(
        new AtomicBlockChild(el, () => {
          void renderTrackedBlock(plugin, block);
        })
      );
    });
  }
}

// src/data/vault-source.ts
var import_obsidian7 = require("obsidian");

// src/util/duration-map.ts
function durationMapFromSessions(sessions) {
  const map = /* @__PURE__ */ new Map();
  for (const session of sessions) {
    if (!session.date) continue;
    const entry = map.get(session.date) || { minutes: 0, path: null };
    entry.minutes += session.duration_min;
    if (!entry.path) entry.path = session.path;
    map.set(session.date, entry);
  }
  return map;
}
function addHobbyItemMinutes(map, path, totals) {
  for (const [date, minutes] of totals) {
    const entry = map.get(date) || { minutes: 0, path };
    entry.minutes += minutes;
    if (!entry.path) entry.path = path;
    map.set(date, entry);
  }
}
function durationMapFromHobbyLogs(items, year) {
  const map = /* @__PURE__ */ new Map();
  for (const item of items) {
    addHobbyItemMinutes(
      map,
      item.path,
      minutesByDateForYear(item.entries, year)
    );
  }
  return map;
}

// src/util/folder-files.ts
function isVaultFolderLike(node) {
  return !!node && Array.isArray(node.children);
}
function markdownFilesInFolder(folder) {
  if (!isVaultFolderLike(folder)) return [];
  const out = [];
  const stack = [...folder.children ?? []];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (isVaultFolderLike(node)) {
      if (node.children) stack.push(...node.children);
      continue;
    }
    if (isMarkdownFile(node)) out.push(node);
  }
  return out;
}
function isMarkdownFile(node) {
  if (node.extension) return node.extension === "md";
  return node.path.toLowerCase().endsWith(".md");
}

// src/util/hobby-time-log-cache.ts
var HobbyTimeLogCache = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  get(path, mtime) {
    const hit = this.cache.get(path);
    if (!hit || hit.mtime !== mtime) return null;
    return hit.entries;
  }
  set(path, mtime, entries) {
    this.cache.set(path, { mtime, entries });
  }
  invalidate(path) {
    if (!path) {
      this.cache.clear();
      return;
    }
    this.cache.delete(path);
  }
  rename(oldPath, newPath) {
    const hit = this.cache.get(oldPath);
    this.cache.delete(oldPath);
    if (!hit) {
      this.cache.delete(newPath);
      return;
    }
    this.cache.set(newPath, hit);
  }
  get size() {
    return this.cache.size;
  }
};

// src/util/hobby-item-scan.ts
function hobbyItemFromFileCache(params) {
  const { path, basename, activityId } = params;
  const fm = params.frontmatter;
  if (fm == null) {
    return {
      path,
      basename,
      frontmatter: {
        type: "atomic-item",
        activity: activityId,
        title: basename
      }
    };
  }
  if (fm.type !== "atomic-item" || fm.activity !== activityId) return null;
  return { path, basename, frontmatter: fm };
}

// src/util/session-meta.ts
function asList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  const s = String(value).trim();
  return s ? [s] : [];
}
function resolveSessionDate(frontmatter, basename) {
  if (frontmatter?.date != null && frontmatter.date !== "") {
    const raw = String(frontmatter.date);
    const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(basename)) return basename;
  return null;
}
function sessionMetaFromFile(params) {
  const fm = params.frontmatter ?? {};
  return {
    path: params.path,
    basename: params.basename,
    date: resolveSessionDate(params.frontmatter, params.basename),
    duration_min: Number(fm.duration_min) || 0,
    weight_unit: fm.weight_unit === "lb" ? "lb" : "kg",
    focus: asList(fm.focus),
    felt: String(fm.felt || "")
  };
}

// src/util/vault-list-cache.ts
var VaultListCache = class {
  constructor() {
    this.stamp = 0;
    this.entries = /* @__PURE__ */ new Map();
  }
  get(key) {
    const hit = this.entries.get(key);
    if (!hit || hit.stamp !== this.stamp) return void 0;
    return hit.value;
  }
  set(key, value, scope = "") {
    this.entries.set(key, { stamp: this.stamp, value, scope });
  }
  /**
   * Drop cached lists. With a path, only entries whose scope touches that path.
   * With no path, drop everything and bump the generation stamp.
   */
  invalidate(path) {
    if (path == null || path === "") {
      this.stamp++;
      this.entries.clear();
      return;
    }
    for (const [key, entry] of [...this.entries]) {
      if (!entry.scope || pathTouchesScope(path, entry.scope)) {
        this.entries.delete(key);
      }
    }
  }
  get generation() {
    return this.stamp;
  }
  get size() {
    return this.entries.size;
  }
};

// src/data/vault-source.ts
var VaultDataSource = class {
  constructor(app) {
    this.app = app;
    this.hobbyTimeLogCache = new HobbyTimeLogCache();
    this.sessionListCache = new VaultListCache();
    this.hobbyItemListCache = new VaultListCache();
    this.durationMapCache = new VaultListCache();
    this.needsMetadataRefresh = false;
  }
  /** Drop cached Time log parses (all paths, or one path after edit/delete). */
  invalidateHobbyTimeLogCache(path) {
    this.hobbyTimeLogCache.invalidate(
      path ? (0, import_obsidian7.normalizePath)(path) : void 0
    );
    this.durationMapCache.invalidate(path ? (0, import_obsidian7.normalizePath)(path) : void 0);
  }
  /** Keep cache entries aligned when a note is renamed. */
  renameHobbyTimeLogCache(oldPath, newPath) {
    this.hobbyTimeLogCache.rename((0, import_obsidian7.normalizePath)(oldPath), (0, import_obsidian7.normalizePath)(newPath));
  }
  /** Drop cached vault list scans (sessions / hobby items / duration maps). */
  invalidateListCache(path) {
    const scoped = path ? (0, import_obsidian7.normalizePath)(path) : void 0;
    this.sessionListCache.invalidate(scoped);
    this.hobbyItemListCache.invalidate(scoped);
    this.durationMapCache.invalidate(scoped);
  }
  /**
   * True when a list scan called `metadataCache.getFileCache()` and got null
   * (file metadata not indexed yet). Callers should refresh once after
   * `metadataCache.resolved`. Empty frontmatter on an existing cache does
   * not set this flag.
   */
  consumeNeedsMetadataRefresh() {
    const needed = this.needsMetadataRefresh;
    this.needsMetadataRefresh = false;
    return needed;
  }
  /**
   * Parsed Time log entries for a hobby item note.
   * Reuses an in-memory parse while the file mtime is unchanged.
   */
  async getHobbyTimeLogEntries(path) {
    const file = this.getFileByPath(path);
    if (!file) return [];
    const mtime = file.stat.mtime;
    const cached = this.hobbyTimeLogCache.get(file.path, mtime);
    if (cached) return cached;
    const markdown = await this.app.vault.cachedRead(file);
    const entries = parseTimeLog(markdown);
    this.hobbyTimeLogCache.set(file.path, mtime, entries);
    return entries;
  }
  listSessions(folder, year) {
    const prefix = sessionScanPrefix(folder, year);
    if (!prefix) return [];
    const cached = this.sessionListCache.get(prefix);
    if (cached) return cached;
    const out = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file);
      out.push(
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: cache == null ? void 0 : cache.frontmatter ?? {}
        })
      );
    }
    this.sessionListCache.set(prefix, out, prefix);
    return out;
  }
  listHobbyItems(activity) {
    if (activity.domain !== "hobby" || activity.noteModel !== "item" || !activity.supportsTimer) {
      return [];
    }
    const prefix = hobbyItemsScanPrefix(activity.folder);
    if (!prefix) return [];
    const cacheKey = `${activity.id}\0${prefix}`;
    const cached = this.hobbyItemListCache.get(cacheKey);
    if (cached) return cached;
    const out = [];
    for (const file of this.markdownNotesInFolder(prefix.replace(/\/$/, ""))) {
      const cache = this.fileCache(file);
      const item = hobbyItemFromFileCache({
        path: file.path,
        basename: file.basename,
        frontmatter: cache == null ? null : cache.frontmatter ?? {},
        activityId: activity.id
      });
      if (item) out.push(item);
    }
    this.hobbyItemListCache.set(cacheKey, out, prefix);
    return out;
  }
  /**
   * Minutes-by-date for one activity/year. Shared by every heatmap that
   * asks for the same pair until a touching vault path invalidates it.
   */
  async getActivityDurationMap(activity, year) {
    const prefix = activity.domain === "hobby" ? hobbyItemsScanPrefix(activity.folder) : sessionScanPrefix(activity.folder, year);
    if (!prefix) return /* @__PURE__ */ new Map();
    const cacheKey = `${activity.id}\0${prefix}\0${year}`;
    const cached = this.durationMapCache.get(cacheKey);
    if (cached) return cached;
    if (activity.domain === "hobby") {
      const items = this.listHobbyItems(activity);
      const perItem = await Promise.all(
        items.map(async (item) => ({
          path: item.path,
          entries: await this.getHobbyTimeLogEntries(item.path)
        }))
      );
      const map2 = durationMapFromHobbyLogs(perItem, year);
      this.durationMapCache.set(cacheKey, map2, prefix);
      return map2;
    }
    const map = durationMapFromSessions(this.listSessions(activity.folder, year));
    this.durationMapCache.set(cacheKey, map, prefix);
    return map;
  }
  async readBody(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(path));
    if (!(af instanceof import_obsidian7.TFile)) return "";
    return this.app.vault.read(af);
  }
  exists(path) {
    return !!this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(path));
  }
  async ensureFolder(folderPath) {
    const norm = (0, import_obsidian7.normalizePath)(folderPath);
    if (this.app.vault.getAbstractFileByPath(norm)) return;
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
    const norm = (0, import_obsidian7.normalizePath)(path);
    const parent = norm.includes("/") ? norm.slice(0, norm.lastIndexOf("/")) : "";
    if (parent) await this.ensureFolder(parent);
    return this.app.vault.create(norm, content);
  }
  async writeNote(path, content) {
    const norm = (0, import_obsidian7.normalizePath)(path);
    const existing = this.app.vault.getAbstractFileByPath(norm);
    if (existing instanceof import_obsidian7.TFile) {
      await this.app.vault.process(existing, () => content);
      return existing;
    }
    return this.createNote(norm, content);
  }
  /**
   * Apply an updater to the current file bytes. Returns null when the path
   * is missing. Unchanged content is returned as-is so callers can skip a rewrite.
   */
  async processNote(path, updater) {
    const existing = this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(path));
    if (!(existing instanceof import_obsidian7.TFile)) return null;
    await this.app.vault.process(existing, updater);
    return existing;
  }
  async openPath(path) {
    const norm = (0, import_obsidian7.normalizePath)(path);
    const file = this.app.vault.getAbstractFileByPath(norm);
    if (file instanceof import_obsidian7.TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
      return;
    }
    await this.app.workspace.openLinkText(norm, "", false);
  }
  getFileByPath(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(path));
    return af instanceof import_obsidian7.TFile ? af : null;
  }
  isUnderSeriesFolder(path, folders) {
    const norm = (0, import_obsidian7.normalizePath)(path);
    return folders.some((f) => {
      if (!isSafeVaultFolder(f)) return false;
      const p = (0, import_obsidian7.normalizePath)(f);
      return norm === p || norm.startsWith(p + "/");
    });
  }
  getFolder(path) {
    const af = this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(path));
    return af instanceof import_obsidian7.TFolder ? af : null;
  }
  listMarkdownInFolder(folder) {
    if (!isSafeVaultFolder(folder)) return [];
    return this.markdownNotesInFolder(folder);
  }
  /** Resolve a vault path/wikilink target (or absolute URL) into an img src. */
  resolveResourcePath(linkOrPath, sourcePath = "") {
    const trimmed = linkOrPath.trim();
    if (!trimmed) return null;
    if (/^(javascript|vbscript):/i.test(trimmed)) return null;
    if (/^data:/i.test(trimmed)) {
      if (!/^data:image\/(png|jpe?g|gif|webp|avif|bmp)(;|,)/i.test(trimmed)) {
        return null;
      }
      return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed) || /^app:\/\//i.test(trimmed)) {
      return trimmed;
    }
    const fromLink = this.app.metadataCache.getFirstLinkpathDest(
      trimmed,
      sourcePath
    );
    const fromPath = this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(trimmed));
    const file = fromLink instanceof import_obsidian7.TFile ? fromLink : fromPath instanceof import_obsidian7.TFile ? fromPath : null;
    if (!file) return null;
    return this.app.vault.getResourcePath(file);
  }
  markdownNotesInFolder(folderPath) {
    const folder = this.app.vault.getAbstractFileByPath((0, import_obsidian7.normalizePath)(folderPath));
    return markdownFilesInFolder(asFolderLike(folder));
  }
  fileCache(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    if (cache == null) this.needsMetadataRefresh = true;
    return cache;
  }
};
function asFolderLike(node) {
  if (!node || typeof node !== "object") return null;
  if (!("children" in node) || !Array.isArray(node.children)) {
    return null;
  }
  return node;
}

// src/properties/property-select.ts
var import_obsidian8 = require("obsidian");
var SELECT_CLASS = "atomic-property-select";
var HIDDEN_CLASS = "atomic-property-native-hidden";
var SYNC_GRACE_MS = 2e3;
function appendOption(selectEl, value, label, selected = false) {
  const optionEl = selectEl.createEl("option", { text: label, value });
  optionEl.selected = selected;
  return optionEl;
}
function insertOption(selectEl, before, value, label) {
  const optionEl = selectEl.createEl("option", { text: label, value });
  selectEl.insertBefore(optionEl, before);
  return optionEl;
}
function frontmatterForFile(app, file) {
  if (!file) return null;
  const cache = app.metadataCache.getFileCache(file);
  return cache?.frontmatter ?? null;
}
function getFileFromElement(app, el) {
  const leafEl = el.closest(".workspace-leaf");
  if (!leafEl) return app.workspace.getActiveFile();
  let targetFile = null;
  app.workspace.iterateAllLeaves((leaf) => {
    if (leaf.view.containerEl.parentElement === leafEl) {
      const view = leaf.view;
      if ("file" in view && view.file instanceof import_obsidian8.TFile) {
        targetFile = view.file;
      }
    }
  });
  return targetFile ?? app.workspace.getActiveFile();
}
function readNativeValue(valueContainer) {
  const nativeInput = valueContainer.querySelector("input");
  if (nativeInput?.instanceOf(HTMLInputElement)) return nativeInput.value;
  const nativeEditable = valueContainer.querySelector("[contenteditable]");
  return (nativeEditable?.textContent ?? "").replace(/\s+/g, " ").trim();
}
function optionLabel(spec, value, language) {
  const labelKey = spec.labelKey?.(value) ?? value;
  if (labelKey === value) return value;
  const translated = t(labelKey, language);
  return translated === labelKey ? value : translated;
}
function createPropertySelect(app, spec, property, getLanguage, currentValue, onChange) {
  const language = getLanguage();
  const selectEl = createEl("select", {
    cls: [SELECT_CLASS, "dropdown"],
    attr: {
      "data-testid": "atomic-property-select",
      "data-property": property,
      "aria-label": t("property.selectLabel", language, { property })
    }
  });
  for (const value of spec.values) {
    appendOption(
      selectEl,
      value,
      optionLabel(spec, value, language),
      value === currentValue
    );
  }
  if (currentValue && !spec.values.includes(currentValue)) {
    appendOption(selectEl, currentValue, currentValue, true);
  }
  if (spec.allowCustom) {
    appendOption(
      selectEl,
      CUSTOM_LOCATION_SENTINEL,
      t("property.location.custom", language)
    );
  }
  selectEl.dataset.committedValue = currentValue || spec.values[0] || "";
  selectEl.addEventListener("change", () => {
    const language2 = getLanguage();
    const newValue = selectEl.value;
    selectEl.dataset.lastChanged = Date.now().toString();
    if (spec.allowCustom && newValue === CUSTOM_LOCATION_SENTINEL) {
      const previous = selectEl.dataset.committedValue || "";
      selectEl.value = previous;
      void (async () => {
        const raw = await promptText(
          app,
          t("modal.customLocation", language2),
          "",
          language2
        );
        if (raw === null) return;
        const trimmed = raw.trim();
        if (!trimmed) {
          new import_obsidian8.Notice(t("notice.emptyCustomLocation", language2));
          return;
        }
        selectEl.dataset.committedValue = trimmed;
        if (!Array.from(selectEl.options).some((o) => o.value === trimmed)) {
          const customOption = Array.from(selectEl.options).find(
            (o) => o.value === CUSTOM_LOCATION_SENTINEL
          );
          insertOption(selectEl, customOption ?? null, trimmed, trimmed);
        }
        selectEl.value = trimmed;
        onChange(trimmed);
      })();
      return;
    }
    selectEl.dataset.committedValue = newValue;
    onChange(newValue);
  });
  return selectEl;
}
function writePropertyValue(app, file, key, value, valueContainer) {
  if (valueContainer) {
    const nativeInput = valueContainer.querySelector("input");
    const nativeEditable = valueContainer.querySelector("[contenteditable]");
    if (nativeInput?.instanceOf(HTMLInputElement)) {
      nativeInput.value = value;
      nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
      nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (nativeEditable?.instanceOf(HTMLElement)) {
      nativeEditable.textContent = value;
      nativeEditable.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  }
  if (!(file instanceof import_obsidian8.TFile)) return;
  void app.fileManager.processFrontMatter(
    file,
    (frontmatter) => {
      frontmatter[key] = value;
    }
  );
}
function hideNativeEditors(valueContainer) {
  for (const child of Array.from(valueContainer.children)) {
    if (child.classList.contains(SELECT_CLASS)) continue;
    if (child.instanceOf(HTMLElement)) {
      child.hidden = true;
      child.addClass(HIDDEN_CLASS);
    }
  }
}
function syncExistingSelect(selectEl, spec, currentValue, fallbackValue) {
  const lastChanged = Number.parseInt(selectEl.dataset.lastChanged || "0", 10);
  if (Date.now() - lastChanged < SYNC_GRACE_MS) return;
  const valueToSet = currentValue || fallbackValue;
  if (valueToSet && !spec.values.includes(valueToSet)) {
    const hasOption = Array.from(selectEl.options).some(
      (option) => option.value === valueToSet
    );
    if (!hasOption) {
      const customOption = Array.from(selectEl.options).find(
        (option) => option.value === CUSTOM_LOCATION_SENTINEL
      );
      insertOption(selectEl, customOption ?? null, valueToSet, valueToSet);
    }
  }
  if (selectEl.value !== valueToSet) {
    selectEl.value = valueToSet;
  }
  selectEl.dataset.committedValue = valueToSet;
}
function stopBasesPointerCapture(selectEl) {
  const stop = (event) => {
    event.stopPropagation();
  };
  for (const type of [
    "mousedown",
    "mouseup",
    "click",
    "pointerdown",
    "pointerup",
    "focusin"
  ]) {
    selectEl.addEventListener(type, stop);
    selectEl.addEventListener(type, stop, { capture: true });
  }
}
function injectPropertySelect(app, getLanguage, property, spec, valueContainer, file, forBases) {
  const existing = valueContainer.querySelector(`.${SELECT_CLASS}`);
  const currentValue = forBases ? (valueContainer.querySelector(".metadata-input-longtext")?.textContent ?? "").replace(/\s+/g, " ").trim() : readNativeValue(valueContainer);
  if (existing?.instanceOf(HTMLSelectElement)) {
    syncExistingSelect(existing, spec, currentValue, spec.values[0] ?? "");
    return;
  }
  if (!forBases) hideNativeEditors(valueContainer);
  const editableValue = currentValue;
  const selectEl = createPropertySelect(
    app,
    spec,
    property,
    getLanguage,
    editableValue,
    (newValue) => {
      writePropertyValue(app, file, property, newValue, forBases ? void 0 : valueContainer);
    }
  );
  if (forBases) {
    selectEl.classList.add("mod-base");
    stopBasesPointerCapture(selectEl);
  }
  valueContainer.appendChild(selectEl);
}
function registerPropertySelects(plugin, options) {
  const app = plugin.app;
  const { getLanguage } = options;
  const inject = (container) => {
    container.querySelectorAll(".metadata-property").forEach((propEl) => {
      const keyEl = propEl.querySelector(".metadata-property-key-input");
      if (!keyEl?.instanceOf(HTMLInputElement)) return;
      const property = (keyEl.value || keyEl.textContent || "").trim();
      if (!property) return;
      if (!propEl.instanceOf(HTMLElement)) return;
      const file = getFileFromElement(app, propEl);
      const frontmatter = frontmatterForFile(app, file);
      const spec = resolvePropertyOptions(property, { frontmatter });
      if (!spec) return;
      const valueContainer = propEl.querySelector(".metadata-property-value");
      if (!valueContainer?.instanceOf(HTMLElement)) return;
      injectPropertySelect(
        app,
        getLanguage,
        property,
        spec,
        valueContainer,
        file,
        false
      );
    });
    for (const property of DROPDOWN_PROPERTY_NAMES) {
      container.querySelectorAll(`.bases-td[data-property="note.${property}"]`).forEach((cellEl) => {
        if (!cellEl.instanceOf(HTMLElement)) return;
        const row = cellEl.closest(".bases-tr");
        if (!row?.instanceOf(HTMLElement)) return;
        const link = row.querySelector(".internal-link");
        const href = link?.getAttribute("data-href") ?? "";
        const file = href ? app.metadataCache.getFirstLinkpathDest(href, "") : null;
        const frontmatter = frontmatterForFile(
          app,
          file instanceof import_obsidian8.TFile ? file : null
        );
        const spec = resolvePropertyOptions(property, { frontmatter });
        if (!spec) return;
        injectPropertySelect(
          app,
          getLanguage,
          property,
          spec,
          cellEl,
          file instanceof import_obsidian8.TFile ? file : null,
          true
        );
      });
    }
  };
  let injectFrame = null;
  const scheduleInject = () => {
    if (injectFrame !== null) return;
    injectFrame = window.requestAnimationFrame(() => {
      injectFrame = null;
      inject(document.body);
    });
  };
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        scheduleInject();
        return;
      }
    }
  });
  plugin.register(() => {
    observer.disconnect();
    if (injectFrame !== null) {
      window.cancelAnimationFrame(injectFrame);
      injectFrame = null;
    }
  });
  plugin.app.workspace.onLayoutReady(() => {
    observer.observe(document.body, { childList: true, subtree: true });
    inject(document.body);
  });
}

// src/settings.ts
var import_obsidian9 = require("obsidian");

// src/util/merge-settings.ts
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function safeVaultPath(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return isSafeVaultFolder(trimmed) ? trimmed : fallback;
}
function stringField(value) {
  return typeof value === "string" ? value : "";
}
function cloneActivities(activityTypes) {
  return activityTypes.map((activity) => ({
    ...activity,
    enabled: activity.enabled !== false,
    baseColor: activity.baseColor,
    colors: [
      activity.colors[0],
      activity.colors[1],
      activity.colors[2],
      activity.colors[3]
    ]
  }));
}
function normalizeActivities(values, fallback) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const normalized = values.map((value) => normalizeActivityType(value, fallback[0].colors)).filter((activity) => activity !== null);
  return normalized.length > 0 ? normalized : cloneActivities(fallback);
}
function appendMissingBuiltInHobbies(activityTypes, builtIns) {
  const existingIds = new Set(activityTypes.map((activity) => activity.id));
  const addedBuiltIns = builtIns.filter(
    (activity) => activity.domain === "hobby" && !existingIds.has(activity.id)
  );
  return [...activityTypes, ...cloneActivities(addedBuiltIns)];
}
function legacySeriesActivities(values, fallback) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const normalized = values.map((value) => activityTypeFromSeries(value, fallback[0].colors)).filter((activity) => activity !== null);
  return normalized.length > 0 ? normalized : cloneActivities(fallback);
}
function mergeSettings(raw) {
  const base = {
    ...DEFAULT_SETTINGS,
    activityTypes: cloneActivities(DEFAULT_SETTINGS.activityTypes),
    gymExercises: [...DEFAULT_SETTINGS.gymExercises]
  };
  if (!isRecord3(raw)) return base;
  const golfCuesPath = safeVaultPath(
    stringField(raw.golfCuesPath).trim() || stringField(raw.cuesPath).trim(),
    base.golfCuesPath
  );
  const fromActivityTypes = normalizeActivities(
    raw.activityTypes,
    base.activityTypes
  );
  const fromLegacySeries = legacySeriesActivities(raw.series, base.activityTypes);
  let activityTypes;
  if (fromActivityTypes) {
    activityTypes = fromActivityTypes;
  } else if (fromLegacySeries) {
    activityTypes = appendMissingBuiltInHobbies(
      fromLegacySeries,
      DEFAULT_SETTINGS.activityTypes
    );
  } else {
    activityTypes = cloneActivities(base.activityTypes);
  }
  const timezone = stringField(raw.timezone);
  return {
    language: isLanguage(raw.language) ? raw.language : DEFAULT_LANGUAGE,
    timezone: timezone || base.timezone,
    dashboardPath: safeVaultPath(raw.dashboardPath, base.dashboardPath),
    golfCuesPath,
    gymCuesPath: safeVaultPath(raw.gymCuesPath, base.gymCuesPath),
    activityTypes,
    gymExercises: normalizeGymExercises(raw.gymExercises),
    gymLogSetup: isGymLogSetup(raw.gymLogSetup) ? raw.gymLogSetup : "pending"
  };
}

// src/settings.ts
function styleDestructiveButton(button) {
  button.buttonEl.addClass("mod-warning");
}
function isFunction(value) {
  return typeof value === "function";
}
function callNamedMethod(target, name) {
  const method = target[name];
  if (!isFunction(method)) return false;
  method.call(target);
  return true;
}
var ConfirmDeleteActivityModal = class extends import_obsidian9.Modal {
  constructor(app, options) {
    super(app);
    this.message = options.message;
    this.confirmLabel = options.confirmLabel;
    this.cancelLabel = options.cancelLabel;
    this.onConfirm = options.onConfirm;
  }
  onOpen() {
    this.modalEl.setAttr("data-testid", "atomic-confirm-delete-modal");
    this.contentEl.empty();
    this.contentEl.createEl("p", { text: this.message });
    new import_obsidian9.Setting(this.contentEl).addButton(
      (button) => button.setButtonText(this.cancelLabel).onClick(() => this.close())
    ).addButton((button) => {
      button.setButtonText(this.confirmLabel);
      styleDestructiveButton(button);
      button.onClick(() => {
        this.onConfirm();
        this.close();
      });
    });
  }
};
var FitnessSettingTab = class extends import_obsidian9.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.pendingExerciseName = "";
    this.pendingHobbyName = "";
    this.plugin = plugin;
  }
  /** Fallback for Obsidian < 1.13.0. 1.13+ renders `getSettingDefinitions()`. */
  display() {
    this.paintSettings(this.containerEl);
  }
  getSettingDefinitions() {
    const language = this.plugin.settings.language;
    const items = [
      {
        name: t("settings.language", language),
        desc: t("settings.languageDesc", language),
        control: {
          type: "dropdown",
          key: "language",
          options: {
            "zh-Hant-en": t("settings.languageOption.zh-Hant-en", language),
            en: t("settings.languageOption.en", language)
          }
        }
      },
      {
        name: t("settings.timezone", language),
        desc: t("settings.timezoneDesc", language),
        control: {
          type: "text",
          key: "timezone",
          placeholder: "Asia/Hong_Kong"
        }
      },
      {
        name: t("settings.dashboardPath", language),
        desc: t("settings.dashboardPathDesc", language),
        control: {
          type: "text",
          key: "dashboardPath",
          placeholder: DEFAULT_SETTINGS.dashboardPath,
          validate: (value) => {
            const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
            if (!isSafeVaultFolder(next)) {
              return t("notice.folderUnsafe", this.plugin.settings.language);
            }
          }
        }
      },
      {
        name: t("settings.exerciseTypes", language),
        desc: t("settings.exerciseTypesDesc", language),
        render: (setting) => {
          setting.setHeading();
        }
      }
    ];
    for (const activity of allExerciseActivities(this.plugin.settings.activityTypes)) {
      items.push(...this.activityDefinitionItems(activity, { showCues: true }));
    }
    items.push({
      name: t("settings.addExerciseType", language),
      desc: t("settings.addExerciseTypeDesc", language),
      render: (setting) => {
        this.paintAddActivity(setting, "exercise");
      }
    });
    items.push({
      name: t("settings.hobbyTypes", language),
      desc: t("settings.hobbyTypesDesc", language),
      render: (setting) => {
        setting.setHeading();
      }
    });
    for (const activity of allHobbyActivities(this.plugin.settings.activityTypes)) {
      items.push(...this.activityDefinitionItems(activity, { showCues: false }));
    }
    items.push({
      name: t("settings.addHobbyType", language),
      desc: t("settings.addHobbyTypeDesc", language),
      render: (setting) => {
        this.paintAddActivity(setting, "hobby");
      }
    });
    items.push({
      name: t("settings.gymExercises", language),
      desc: t("settings.gymExercisesDesc", language),
      render: (setting) => {
        setting.setHeading();
      }
    });
    items.push({
      name: t("settings.gymImport", language),
      desc: t("settings.gymImportDesc", language),
      render: (setting) => {
        this.paintGymImport(setting);
      }
    });
    return items;
  }
  getControlValue(key) {
    if (key === "language") return this.plugin.settings.language;
    if (key === "timezone") return this.plugin.settings.timezone;
    if (key === "dashboardPath") return this.plugin.settings.dashboardPath;
    return void 0;
  }
  async setControlValue(key, value) {
    if (key === "language") {
      if (typeof value !== "string" || !isLanguage(value)) return;
      this.plugin.settings.language = value;
      await this.plugin.saveSettings();
      this.redrawSettings();
      await this.plugin.refreshAll();
      new import_obsidian9.Notice(t("notice.reloadForCommands", value));
      return;
    }
    if (key === "timezone") {
      if (typeof value !== "string") return;
      this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
      await this.plugin.saveSettings();
      void this.plugin.refreshAll();
      return;
    }
    if (key === "dashboardPath") {
      if (typeof value !== "string") return;
      const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
      if (!isSafeVaultFolder(next)) {
        new import_obsidian9.Notice(t("notice.folderUnsafe", this.plugin.settings.language));
        return;
      }
      this.plugin.settings.dashboardPath = next;
      await this.plugin.saveSettings();
    }
  }
  redrawSettings() {
    if (callNamedMethod(this, "update")) return;
    this.paintSettings(this.containerEl);
  }
  paintSettings(containerEl) {
    const language = this.plugin.settings.language;
    containerEl.empty();
    this.paintLanguage(new import_obsidian9.Setting(containerEl), language);
    this.paintTimezone(new import_obsidian9.Setting(containerEl), language);
    this.paintDashboardPath(new import_obsidian9.Setting(containerEl), language);
    new import_obsidian9.Setting(containerEl).setName(t("settings.exerciseTypes", language)).setDesc(t("settings.exerciseTypesDesc", language)).setHeading();
    for (const activity of allExerciseActivities(this.plugin.settings.activityTypes)) {
      this.paintActivityRows(containerEl, activity, { showCues: true });
    }
    this.paintAddActivity(
      new import_obsidian9.Setting(containerEl).setName(t("settings.addExerciseType", language)).setDesc(t("settings.addExerciseTypeDesc", language)),
      "exercise"
    );
    new import_obsidian9.Setting(containerEl).setName(t("settings.hobbyTypes", language)).setDesc(t("settings.hobbyTypesDesc", language)).setHeading();
    for (const activity of allHobbyActivities(this.plugin.settings.activityTypes)) {
      this.paintActivityRows(containerEl, activity, { showCues: false });
    }
    this.paintAddActivity(
      new import_obsidian9.Setting(containerEl).setName(t("settings.addHobbyType", language)).setDesc(t("settings.addHobbyTypeDesc", language)),
      "hobby"
    );
    new import_obsidian9.Setting(containerEl).setName(t("settings.gymExercises", language)).setDesc(t("settings.gymExercisesDesc", language)).setHeading();
    this.paintGymImport(
      new import_obsidian9.Setting(containerEl).setName(t("settings.gymImport", language)).setDesc(t("settings.gymImportDesc", language))
    );
  }
  paintLanguage(setting, language) {
    setting.setName(t("settings.language", language)).setDesc(t("settings.languageDesc", language)).addDropdown(
      (dropdown) => dropdown.addOption("zh-Hant-en", t("settings.languageOption.zh-Hant-en", language)).addOption("en", t("settings.languageOption.en", language)).setValue(language).onChange(async (value) => {
        if (!isLanguage(value)) return;
        this.plugin.settings.language = value;
        await this.plugin.saveSettings();
        this.redrawSettings();
        await this.plugin.refreshAll();
        new import_obsidian9.Notice(t("notice.reloadForCommands", value));
      })
    );
  }
  paintTimezone(setting, language) {
    setting.setName(t("settings.timezone", language)).setDesc(t("settings.timezoneDesc", language)).addText(
      (text) => text.setPlaceholder("Asia/Hong_Kong").setValue(this.plugin.settings.timezone).onChange(async (value) => {
        this.plugin.settings.timezone = value.trim() || "Asia/Hong_Kong";
        await this.plugin.saveSettings();
        void this.plugin.refreshAll();
      })
    );
  }
  paintDashboardPath(setting, language) {
    setting.setName(t("settings.dashboardPath", language)).setDesc(t("settings.dashboardPathDesc", language)).addText(
      (text) => text.setPlaceholder(DEFAULT_SETTINGS.dashboardPath).setValue(this.plugin.settings.dashboardPath).onChange(async (value) => {
        const next = value.trim() || DEFAULT_SETTINGS.dashboardPath;
        if (!isSafeVaultFolder(next)) {
          new import_obsidian9.Notice(t("notice.folderUnsafe", this.plugin.settings.language));
          return;
        }
        this.plugin.settings.dashboardPath = next;
        await this.plugin.saveSettings();
      })
    );
  }
  activityDefinitionItems(activity, options) {
    const language = this.plugin.settings.language;
    return [
      {
        name: activity.label,
        desc: t("settings.activityId", language, { id: activity.id }),
        aliases: [activity.id],
        render: (setting) => {
          this.paintActivityControls(setting, activity, options);
        }
      },
      {
        name: t("settings.baseColor", language, { label: activity.label }),
        desc: t("settings.baseColorDesc", language),
        aliases: [activity.id, "color"],
        render: (setting) => {
          this.paintColorControls(setting, activity);
        }
      }
    ];
  }
  async saveAndRefresh() {
    await this.plugin.saveSettings();
    await this.plugin.refreshAll();
  }
  uniqueActivityId(baseId) {
    const used = new Set(this.plugin.settings.activityTypes.map((activity) => activity.id));
    if (!used.has(baseId)) return baseId;
    let index = 2;
    while (used.has(`${baseId}-${index}`)) index += 1;
    return `${baseId}-${index}`;
  }
  paintActivityRows(containerEl, activity, options) {
    const language = this.plugin.settings.language;
    this.paintActivityControls(
      new import_obsidian9.Setting(containerEl).setName(activity.label).setDesc(t("settings.activityId", language, { id: activity.id })),
      activity,
      options
    );
    this.paintColorControls(
      new import_obsidian9.Setting(containerEl).setName(t("settings.baseColor", language, { label: activity.label })).setDesc(t("settings.baseColorDesc", language)),
      activity
    );
  }
  paintActivityControls(setting, activity, options) {
    const language = this.plugin.settings.language;
    const folderPlaceholder = options.showCues ? t("settings.exerciseFolderPlaceholder", language) : t("settings.hobbyFolderPlaceholder", language);
    setting.setClass("atomic-setting-exercise-type").addToggle(
      (toggle) => toggle.setTooltip(t("settings.enabledTooltip", language)).setValue(activity.enabled !== false).onChange(async (value) => {
        activity.enabled = value;
        await this.saveAndRefresh();
      })
    ).addText(
      (text) => text.setPlaceholder(t("settings.labelPlaceholder", language)).setValue(activity.label).onChange(async (value) => {
        const label = value.trim();
        if (!label) return;
        activity.label = label;
        await this.saveAndRefresh();
      })
    ).addText(
      (text) => text.setPlaceholder(folderPlaceholder).setValue(activity.folder).onChange(async (value) => {
        const folder = value.trim();
        if (!isSafeVaultFolder(folder)) {
          new import_obsidian9.Notice(t("notice.folderUnsafe", this.plugin.settings.language));
          return;
        }
        activity.folder = folder;
        await this.saveAndRefresh();
      })
    );
    setting.settingEl.setAttr("data-testid", "atomic-setting-activity");
    setting.settingEl.setAttr("data-activity-id", activity.id);
    if (options.showCues) {
      setting.addToggle(
        (toggle) => toggle.setTooltip(t("settings.enableCuesTooltip", language)).setValue(activity.supportsCues).onChange(async (value) => {
          activity.supportsCues = value;
          await this.saveAndRefresh();
        })
      );
    }
    setting.addButton((button) => {
      button.setButtonText(t("settings.delete", language));
      styleDestructiveButton(button);
      button.onClick(() => {
        this.confirmDeleteActivity(activity);
      });
    });
  }
  paintColorControls(setting, activity) {
    setting.setClass("atomic-setting-colors").addColorPicker(
      (picker) => picker.setValue(activity.baseColor || activity.colors[2]).onChange(async (value) => {
        activity.baseColor = value;
        activity.colors = shadesFromBaseColor(value);
        await this.saveAndRefresh();
        this.renderColorSwatches(setting.controlEl, activity);
      })
    );
    setting.settingEl.setAttr("data-testid", "atomic-setting-colors");
    setting.settingEl.setAttr("data-activity-id", activity.id);
    this.renderColorSwatches(setting.controlEl, activity);
  }
  paintAddActivity(setting, kind) {
    const language = this.plugin.settings.language;
    const isHobby = kind === "hobby";
    setting.addText(
      (text) => text.setPlaceholder(
        t(
          isHobby ? "settings.hobbyNamePlaceholder" : "settings.exerciseNamePlaceholder",
          language
        )
      ).setValue(isHobby ? this.pendingHobbyName : this.pendingExerciseName).onChange((value) => {
        if (isHobby) this.pendingHobbyName = value;
        else this.pendingExerciseName = value;
      })
    ).addButton(
      (button) => button.setButtonText(t("settings.add", language)).onClick(async () => {
        const name = (isHobby ? this.pendingHobbyName : this.pendingExerciseName).trim();
        if (!name) {
          new import_obsidian9.Notice(
            t(
              isHobby ? "notice.enterHobbyType" : "notice.enterExerciseType",
              this.plugin.settings.language
            )
          );
          return;
        }
        const activity = isHobby ? createHobbyActivityType(name) : createExerciseActivityType(name);
        activity.id = this.uniqueActivityId(activity.id);
        this.plugin.settings.activityTypes = [
          ...this.plugin.settings.activityTypes,
          activity
        ];
        if (isHobby) this.pendingHobbyName = "";
        else this.pendingExerciseName = "";
        await this.saveAndRefresh();
        this.redrawSettings();
      })
    );
    if (isHobby) {
      setting.settingEl.setAttr("data-testid", "atomic-setting-add-hobby");
    }
  }
  paintGymImport(setting) {
    const language = this.plugin.settings.language;
    const count = this.plugin.settings.gymExercises.length;
    setting.setDesc(
      `${t("settings.gymImportDesc", language)} ${t("settings.gymExercisesCount", language, { count })}`
    );
    setting.addButton((button) => {
      button.setButtonText(t("settings.gymImport", language));
      button.buttonEl.setAttr("data-testid", "atomic-setting-gym-import");
      button.onClick(() => {
        void runGymLogSetup(this.plugin).then(() => this.redrawSettings());
      });
    });
    setting.settingEl.setAttr("data-testid", "atomic-setting-gym-exercises");
  }
  renderColorSwatches(controlEl, activity) {
    controlEl.querySelectorAll(".atomic-color-swatch-row").forEach((node) => node.remove());
    const row = controlEl.createDiv({
      cls: "atomic-color-swatch-row",
      attr: { "data-testid": "atomic-color-swatch-row" }
    });
    for (const color of activity.colors) {
      const swatch = row.createDiv({
        cls: "atomic-color-swatch",
        attr: { "data-testid": "atomic-color-swatch" }
      });
      swatch.style.backgroundColor = color;
      swatch.title = color;
    }
  }
  confirmDeleteActivity(activity) {
    const language = this.plugin.settings.language;
    new ConfirmDeleteActivityModal(this.app, {
      message: t("settings.deleteConfirm", language, { label: activity.label }),
      confirmLabel: t("settings.delete", language),
      cancelLabel: t("modal.cancel", language),
      onConfirm: () => {
        void this.deleteActivity(activity);
      }
    }).open();
  }
  async deleteActivity(activity) {
    this.plugin.settings.activityTypes = this.plugin.settings.activityTypes.filter(
      (candidate) => candidate.id !== activity.id
    );
    await this.saveAndRefresh();
    this.redrawSettings();
    new import_obsidian9.Notice(
      t("notice.activityDeleted", this.plugin.settings.language, {
        label: activity.label
      })
    );
  }
};

// src/util/refresh-path.ts
function normalizeSlashes3(path) {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
function normalizeVaultPath2(path) {
  return normalizeSlashes3(path.trim());
}
function parentFolder(filePath) {
  const norm = normalizeVaultPath2(filePath);
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return null;
  const parent = norm.slice(0, idx);
  return isSafeVaultFolder(parent) ? parent : null;
}
function collectAtomicDataRoots(settings) {
  const folderRoots = /* @__PURE__ */ new Set(["atomics"]);
  const filePaths = /* @__PURE__ */ new Set();
  for (const activity of settings.activityTypes) {
    if (isSafeVaultFolder(activity.folder)) {
      folderRoots.add(normalizeVaultPath2(activity.folder).replace(/\/$/, ""));
    }
  }
  for (const configured of [
    settings.dashboardPath,
    settings.golfCuesPath,
    settings.gymCuesPath
  ]) {
    const norm = normalizeVaultPath2(configured);
    if (!norm) continue;
    filePaths.add(norm);
    const parent = parentFolder(norm);
    if (parent) folderRoots.add(parent);
  }
  return {
    folderRoots: [...folderRoots],
    filePaths: [...filePaths]
  };
}
function isUnderFolderRoot(path, root) {
  const normPath = normalizeVaultPath2(path);
  const normRoot = normalizeVaultPath2(root).replace(/\/$/, "");
  return normPath === normRoot || normPath.startsWith(`${normRoot}/`);
}
function pathAffectsAtomicRefresh(path, roots, liveBlockSourcePaths) {
  const norm = normalizeVaultPath2(path);
  if (!norm) return false;
  if (liveBlockSourcePaths.some((sourcePath) => normalizeVaultPath2(sourcePath) === norm)) {
    return true;
  }
  if (roots.filePaths.some((filePath) => normalizeVaultPath2(filePath) === norm)) {
    return true;
  }
  return roots.folderRoots.some((root) => isUnderFolderRoot(norm, root));
}

// src/main.ts
var REFRESH_DEBOUNCE_MS = 300;
var FitnessPlugin = class extends import_obsidian10.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.liveBlocks = [];
    this.refreshTimer = null;
  }
  async onload() {
    this.data = new VaultDataSource(this.app);
    registerCodeblocks(this);
    await this.loadSettings();
    this.scheduleRefresh();
    registerPropertySelects(this, {
      getLanguage: () => this.settings.language
    });
    this.addSettingTab(new FitnessSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => {
      this.promptGymLogSetupIfPending();
    });
    this.addCommand({
      id: "new-gym-session",
      name: t("command.newGymSession", this.settings.language),
      callback: () => {
        void this.createGymSession();
      }
    });
    this.addCommand({
      id: "new-golf-session",
      name: t("command.newGolfSession", this.settings.language),
      callback: () => {
        void this.createGolfSession();
      }
    });
    this.addCommand({
      id: "new-exercise-session",
      name: t("command.newExerciseSession", this.settings.language),
      callback: () => {
        void this.createExerciseSession();
      }
    });
    this.addCommand({
      id: "new-reading-item",
      name: t("command.newReadingItem", this.settings.language),
      callback: () => {
        void this.createReadingItem();
      }
    });
    this.addCommand({
      id: "new-hobby-item",
      name: t("command.newHobbyItem", this.settings.language),
      callback: () => {
        void this.createHobbyItem();
      }
    });
    this.addCommand({
      id: "create-reading-bookshelf",
      name: t("command.createReadingBookshelf", this.settings.language),
      callback: () => {
        if (!this.hobbyActivityById("reading")) {
          new import_obsidian10.Notice(t("notice.noReadingHobby", this.settings.language));
          return;
        }
        void createReadingBookshelfCommand(this.app, this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "open-reading-bookshelf",
      name: t("command.openReadingBookshelf", this.settings.language),
      callback: () => {
        if (!this.hobbyActivityById("reading")) {
          new import_obsidian10.Notice(t("notice.noReadingHobby", this.settings.language));
          return;
        }
        void openReadingBookshelfCommand(this.app, this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "create-book-shelf",
      name: t("command.createBookShelf", this.settings.language),
      callback: () => {
        void createBookShelfHostCommand(this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "open-book-shelf",
      name: t("command.openBookShelf", this.settings.language),
      callback: () => {
        void openBookShelfHostCommand(this.data, this.settings.language);
      }
    });
    this.addCommand({
      id: "open-dashboard",
      name: t("command.openDashboard", this.settings.language),
      callback: () => {
        void this.openDashboard();
      }
    });
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.handleVaultPathChange(file.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.handleVaultPathChange(file.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.handleVaultPathChange(file.path, oldPath);
      })
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.handleVaultPathChange(file.path);
      })
    );
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => {
        if (!this.liveBlocks.some((block) => block.el.isConnected)) return;
        if (!this.data.consumeNeedsMetadataRefresh()) return;
        this.data.invalidateListCache();
        this.scheduleRefresh();
      })
    );
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
  promptGymLogSetupIfPending() {
    promptGymLogSetup(this);
  }
  trackLiveBlock(block) {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el.isConnected);
    this.liveBlocks = this.liveBlocks.filter((b) => b.el !== block.el);
    this.liveBlocks.push(block);
  }
  scheduleRefresh() {
    if (this.refreshTimer != null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshAll();
    }, REFRESH_DEBOUNCE_MS);
  }
  async refreshAll() {
    this.liveBlocks = this.liveBlocks.filter((b) => b.el.isConnected);
    await Promise.all(
      this.liveBlocks.map((block) => renderTrackedBlock(this, block))
    );
  }
  liveBlockSourcePaths() {
    return this.liveBlocks.map((block) => block.sourcePath);
  }
  pathAffectsRefresh(path) {
    return pathAffectsAtomicRefresh(
      path,
      collectAtomicDataRoots(this.settings),
      this.liveBlockSourcePaths()
    );
  }
  handleVaultPathChange(path, oldPath) {
    const affectsCurrent = this.pathAffectsRefresh(path) || oldPath != null && this.pathAffectsRefresh(oldPath);
    if (!affectsCurrent) return;
    if (oldPath != null) {
      this.data.renameHobbyTimeLogCache(oldPath, path);
      this.data.invalidateListCache(oldPath);
    } else {
      this.data.invalidateHobbyTimeLogCache(path);
    }
    this.data.invalidateListCache(path);
    this.scheduleRefresh();
  }
  exerciseActivityById(id) {
    return exerciseActivities(this.settings.activityTypes).find(
      (activity) => activity.id === id
    );
  }
  hobbyActivityById(id) {
    return hobbyActivities(this.settings.activityTypes).find(
      (activity) => activity.id === id
    );
  }
  chooseActivity(activities, emptyNoticeKey, placeholderKey) {
    if (!activities.length) {
      new import_obsidian10.Notice(t(emptyNoticeKey, this.settings.language));
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      let settled = false;
      const modal = new class extends import_obsidian10.FuzzySuggestModal {
        getItems() {
          return activities;
        }
        getItemText(activity) {
          return activity.label;
        }
        onChooseItem(activity) {
          if (settled) return;
          settled = true;
          resolve(activity);
        }
        onClose() {
          if (settled) return;
          settled = true;
          resolve(null);
        }
      }(this.app);
      modal.setPlaceholder(t(placeholderKey, this.settings.language));
      modal.open();
    });
  }
  chooseExerciseActivity() {
    return this.chooseActivity(
      exerciseActivities(this.settings.activityTypes),
      "notice.noExerciseActivities",
      "modal.exerciseTypePlaceholder"
    );
  }
  chooseHobbyActivity() {
    return this.chooseActivity(
      hobbyActivities(this.settings.activityTypes),
      "notice.noHobbyActivities",
      "modal.hobbyTypePlaceholder"
    );
  }
  async createExerciseSession(activity) {
    const picked = activity ?? await this.chooseExerciseActivity();
    if (!picked) return;
    await createActivitySession(
      this.app,
      this.data,
      picked,
      this.settings.timezone,
      this.settings.language
    );
  }
  async createGymSession() {
    const activity = this.exerciseActivityById("gym");
    if (!activity) {
      new import_obsidian10.Notice(t("notice.noGymActivity", this.settings.language));
      return;
    }
    await createGymSession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
      this.settings.language
    );
  }
  async createGolfSession() {
    const activity = this.exerciseActivityById("golf");
    if (!activity) {
      new import_obsidian10.Notice(t("notice.noGolfActivity", this.settings.language));
      return;
    }
    await createGolfSession(
      this.app,
      this.data,
      activity,
      this.settings.timezone,
      this.settings.language
    );
  }
  async createReadingItem() {
    const activity = this.hobbyActivityById("reading");
    if (!activity) {
      new import_obsidian10.Notice(t("notice.noReadingHobby", this.settings.language));
      return;
    }
    await createReadingItem(this.app, this.data, activity, this.settings.language);
  }
  async createHobbyItem(activity) {
    const picked = activity ?? await this.chooseHobbyActivity();
    if (!picked) return;
    await createHobbyItem(this.app, this.data, picked, this.settings.language);
  }
  async openDashboard() {
    const path = this.settings.dashboardPath;
    if (!this.data.exists(path)) {
      new import_obsidian10.Notice(t("notice.dashboardNotFound", this.settings.language, { path }));
      return;
    }
    await this.data.openPath(path);
  }
};
