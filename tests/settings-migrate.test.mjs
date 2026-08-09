import test from "node:test";
import assert from "node:assert/strict";
import { mergeSettings } from "../src/util/merge-settings.ts";
import { rewriteFitnessCuesFences } from "../src/util/migrate-cues.ts";

test("mergeSettings defaults include golf/gym paths and legacy on", () => {
  const s = mergeSettings(null);
  assert.equal(s.dashboardPath, "atomics/Dashboard.md");
  assert.equal(
    s.readingNotesBasePath,
    "atomics/hobbies/Reading/Reading Notes.base",
  );
  assert.equal(s.golfCuesPath, "atomics/exercise/Golf/Cues.md");
  assert.equal(s.gymCuesPath, "atomics/exercise/Gym/Cues.md");
  assert.equal(
    s.activityTypes.find((activity) => activity.id === "gym")?.folder,
    "atomics/exercise/Gym",
  );
  assert.equal(
    s.activityTypes.find((activity) => activity.id === "golf")?.folder,
    "atomics/exercise/Golf",
  );
  assert.deepEqual(
    s.activityTypes.map((activity) => ({
      id: activity.id,
      domain: activity.domain,
      noteModel: activity.noteModel,
      supportsCues: activity.supportsCues,
      supportsTimer: activity.supportsTimer,
      supportsSetTable: activity.supportsSetTable,
    })),
    [
      {
        id: "gym",
        domain: "exercise",
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: true,
      },
      {
        id: "golf",
        domain: "exercise",
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: false,
      },
      {
        id: "reading",
        domain: "hobby",
        noteModel: "item",
        supportsCues: false,
        supportsTimer: true,
        supportsSetTable: false,
      },
    ],
  );
  assert.equal(
    s.activityTypes.find((activity) => activity.id === "reading")?.folder,
    "atomics/hobbies/Reading",
  );
  assert.equal(s.deprecatedFitnessBlocksEnabled, true);
  assert.equal("cuesPath" in s, false);
  assert.equal("series" in s, false);
});

test("mergeSettings does not resurrect Reading deleted from modern activityTypes", () => {
  const s = mergeSettings({
    activityTypes: [
      {
        id: "gym",
        domain: "exercise",
        label: "Gym",
        folder: "atomics/exercise/Gym",
        colors: ["#1", "#2", "#3", "#4"],
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
        colors: ["#1", "#2", "#3", "#4"],
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: false,
      },
    ],
  });

  assert.equal(s.activityTypes.map((activity) => activity.id).join(","), "gym,golf");
  assert.equal(
    s.activityTypes.find((activity) => activity.id === "reading"),
    undefined,
  );
});

test("mergeSettings preserves enabled false on stored activities", () => {
  const s = mergeSettings({
    activityTypes: [
      {
        id: "reading",
        domain: "hobby",
        label: "Reading",
        folder: "atomics/hobbies/Reading",
        enabled: false,
        baseColor: "#2563eb",
        colors: ["#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
        noteModel: "item",
        supportsCues: false,
        supportsTimer: true,
        supportsSetTable: false,
      },
    ],
  });

  assert.equal(s.activityTypes.length, 1);
  assert.equal(s.activityTypes[0]?.id, "reading");
  assert.equal(s.activityTypes[0]?.enabled, false);
});

test("mergeSettings seeds Reading when migrating legacy series only", () => {
  const s = mergeSettings({
    series: [
      {
        id: "gym",
        label: "Gym",
        folder: "Gym",
        colors: ["#1", "#2", "#3", "#4"],
        kind: "gym",
      },
    ],
  });

  assert.ok(s.activityTypes.some((activity) => activity.id === "reading"));
});

test("mergeSettings maps legacy series to activityTypes and preserves folders until migration", () => {
  const s = mergeSettings({
    dashboardPath: "Fitness/Dashboard.md",
    golfCuesPath: "Golf/Cues.md",
    gymCuesPath: "Gym/Cues.md",
    series: [
      {
        id: "gym",
        label: "Gym",
        folder: "Gym",
        colors: ["#1", "#2", "#3", "#4"],
        kind: "gym",
      },
      {
        id: "golf",
        label: "Golf",
        folder: "Golf",
        colors: ["#1", "#2", "#3", "#4"],
        kind: "golf",
      },
    ],
  });

  assert.equal(s.dashboardPath, "Fitness/Dashboard.md");
  assert.equal(s.golfCuesPath, "Golf/Cues.md");
  assert.equal(s.gymCuesPath, "Gym/Cues.md");
  assert.deepEqual(s.activityTypes.map((activity) => activity.id), ["gym", "golf", "reading"]);
  assert.equal(s.activityTypes.find((activity) => activity.id === "gym")?.folder, "Gym");
  assert.equal(
    s.activityTypes.find((activity) => activity.id === "gym")?.supportsSetTable,
    true,
  );
  assert.equal(s.activityTypes.find((activity) => activity.id === "golf")?.folder, "Golf");
  assert.equal(
    s.activityTypes.find((activity) => activity.id === "golf")?.supportsSetTable,
    false,
  );
});

test("mergeSettings maps legacy cuesPath to golfCuesPath", () => {
  const s = mergeSettings({ cuesPath: "Custom/GolfCues.md" });
  assert.equal(s.golfCuesPath, "Custom/GolfCues.md");
});

test("mergeSettings prefers golfCuesPath over cuesPath", () => {
  const s = mergeSettings({
    cuesPath: "Old.md",
    golfCuesPath: "New.md",
  });
  assert.equal(s.golfCuesPath, "New.md");
});

test("mergeSettings respects deprecatedFitnessBlocksEnabled false", () => {
  const s = mergeSettings({ deprecatedFitnessBlocksEnabled: false });
  assert.equal(s.deprecatedFitnessBlocksEnabled, false);
});

test("mergeSettings keeps language en when set", () => {
  assert.equal(mergeSettings({ language: "en" }).language, "en");
});

test("mergeSettings maps legacy cue flag false to fitness block aliases off", () => {
  const s = mergeSettings({ deprecatedFitnessCuesEnabled: false });
  assert.equal(s.deprecatedFitnessBlocksEnabled, false);
});

test("mergeSettings prefers stored activityTypes over legacy series", () => {
  const s = mergeSettings({
    series: [{ id: "gym", label: "Gym", folder: "Gym", colors: ["#1", "#2", "#3", "#4"], kind: "gym" }],
    activityTypes: [
      {
        id: "running",
        domain: "exercise",
        label: "Running",
        folder: "atomics/exercise/Running",
        colors: ["#a", "#b", "#c", "#d"],
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: false,
      },
    ],
  });

  assert.deepEqual(s.activityTypes.map((activity) => activity.id), ["running"]);
  assert.equal(s.activityTypes[0].folder, "atomics/exercise/Running");
});

test("mergeSettings rejects unsafe activity folders and falls back to defaults", () => {
  const s = mergeSettings({
    activityTypes: [
      {
        id: "bad",
        domain: "exercise",
        label: "Bad",
        folder: "../Bad",
        colors: ["#1", "#2", "#3", "#4"],
        noteModel: "dailySession",
        supportsCues: true,
        supportsTimer: false,
        supportsSetTable: false,
      },
    ],
  });

  assert.deepEqual(s.activityTypes.map((activity) => activity.id), ["gym", "golf", "reading"]);
});

test("rewriteFitnessCuesFences rewrites fence language only", () => {
  const input = `# Cues\n\nUse fitness-cues in prose.\n\n\`\`\`fitness-cues\nyear: 2026\n\`\`\`\n`;
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /```fitness-golf-cues\n/);
  assert.match(markdown, /Use fitness-cues in prose/);
  assert.doesNotMatch(markdown, /```fitness-cues\b/);
});

test("rewriteFitnessCuesFences is idempotent for new name", () => {
  const input = "```fitness-golf-cues\n```\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 0);
  assert.equal(markdown, input);
});

test("rewriteFitnessCuesFences handles tildes and info strings", () => {
  const input = "~~~fitness-cues extra\nyear: 1\n~~~\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /~~~fitness-golf-cues extra\n/);
});

test("rewriteFitnessCuesFences ignores nested fences inside docs samples", () => {
  const input = [
    "Example:",
    "````markdown",
    "```fitness-cues",
    "year: 2026",
    "```",
    "````",
    "",
    "```fitness-cues",
    "year: 2026",
    "```",
    "",
  ].join("\n");
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /````markdown\n```fitness-cues\n/);
  assert.match(markdown, /\n```fitness-golf-cues\n/);
});

test("rewriteFitnessCuesFences rewrites indented top-level fences", () => {
  const input = "  ```fitness-cues\nyear: 1\n  ```\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /^ {2}```fitness-golf-cues\n/);
});

test("mergeSettings rejects unsafe dashboard, reading notes base, and cue paths", () => {
  const s = mergeSettings({
    dashboardPath: "../outside.md",
    readingNotesBasePath: "/abs/Reading Notes.base",
    golfCuesPath: "/abs/Cues.md",
    gymCuesPath: "atomics/exercise/Gym/Cues.md",
  });
  assert.equal(s.dashboardPath, "atomics/Dashboard.md");
  assert.equal(
    s.readingNotesBasePath,
    "atomics/hobbies/Reading/Reading Notes.base",
  );
  assert.equal(s.golfCuesPath, "atomics/exercise/Golf/Cues.md");
  assert.equal(s.gymCuesPath, "atomics/exercise/Gym/Cues.md");
});
