import test from "node:test";
import assert from "node:assert/strict";
import { mergeSettings } from "../src/util/merge-settings.ts";
import { rewriteFitnessCuesFences } from "../src/util/migrate-cues.ts";

test("mergeSettings defaults include golf/gym paths and legacy on", () => {
  const s = mergeSettings(null);
  assert.equal(s.dashboardPath, "atomics/Dashboard.md");
  assert.equal(s.golfCuesPath, "atomics/exercise/Golf/Cues.md");
  assert.equal(s.gymCuesPath, "atomics/exercise/Gym/Cues.md");
  assert.equal(
    s.series.find((series) => series.id === "gym")?.folder,
    "atomics/exercise/Gym",
  );
  assert.equal(
    s.series.find((series) => series.id === "golf")?.folder,
    "atomics/exercise/Golf",
  );
  assert.equal(s.deprecatedFitnessBlocksEnabled, true);
  assert.equal("cuesPath" in s, false);
});

test("mergeSettings preserves legacy stored folders until migration", () => {
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
  assert.equal(s.series.find((series) => series.id === "gym")?.folder, "Gym");
  assert.equal(s.series.find((series) => series.id === "golf")?.folder, "Golf");
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

test("mergeSettings maps legacy cue flag false to fitness block aliases off", () => {
  const s = mergeSettings({ deprecatedFitnessCuesEnabled: false });
  assert.equal(s.deprecatedFitnessBlocksEnabled, false);
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
