import test from "node:test";
import assert from "node:assert/strict";
import {
  planFitnessMigration,
  rewriteFitnessFences,
} from "../src/util/migrate-fitness.ts";
import { mergeSettings } from "../src/util/merge-settings.ts";

const colors = ["#1", "#2", "#3", "#4"];

test("planFitnessMigration moves legacy Fitness paths when destinations are missing", () => {
  const plan = planFitnessMigration({
    existingPaths: new Set([
      "Fitness/Dashboard.md",
      "Gym",
      "Gym/2026/2026-01-01.md",
      "Golf",
    ]),
    settings: mergeSettings({
      dashboardPath: "Fitness/Dashboard.md",
      golfCuesPath: "Golf/Cues.md",
      gymCuesPath: "Gym/Cues.md",
      series: [
        { id: "gym", label: "Gym", folder: "Gym", colors, kind: "gym" },
        { id: "golf", label: "Golf", folder: "Golf", colors, kind: "golf" },
      ],
    }),
  });

  assert.deepEqual(plan.moves, [
    { from: "Fitness/Dashboard.md", to: "atomics/Dashboard.md" },
    { from: "Gym", to: "atomics/exercise/Gym" },
    { from: "Golf", to: "atomics/exercise/Golf" },
  ]);
  assert.deepEqual(plan.skippedMoves, []);
  assert.equal(plan.settingsPatch.dashboardPath, "atomics/Dashboard.md");
  assert.equal(plan.settingsPatch.golfCuesPath, "atomics/exercise/Golf/Cues.md");
  assert.equal(plan.settingsPatch.gymCuesPath, "atomics/exercise/Gym/Cues.md");
  assert.equal(
    plan.settingsPatch.activityTypes?.find((activity) => activity.id === "gym")?.folder,
    "atomics/exercise/Gym",
  );
});

test("planFitnessMigration skips moves whose destination already exists", () => {
  const plan = planFitnessMigration({
    existingPaths: new Set(["Gym", "Gym/2026/2026-01-01.md", "atomics/exercise/Gym"]),
    settings: mergeSettings({
      series: [{ id: "gym", label: "Gym", folder: "Gym", colors, kind: "gym" }],
    }),
  });

  assert.deepEqual(plan.moves, []);
  assert.deepEqual(plan.skippedMoves, [
    { from: "Gym", to: "atomics/exercise/Gym" },
  ]);
  assert.equal(plan.settingsPatch.activityTypes, undefined);
});

test("planFitnessMigration is idempotent after Atomic paths exist", () => {
  const plan = planFitnessMigration({
    existingPaths: new Set(["atomics/Dashboard.md", "atomics/exercise/Gym"]),
    settings: mergeSettings(null),
  });

  assert.deepEqual(plan.moves, []);
  assert.deepEqual(plan.skippedMoves, []);
  assert.deepEqual(plan.settingsPatch, {});
});

test("rewriteFitnessFences rewrites all legacy top-level fitness fences", () => {
  const src = [
    "```fitness-heatmap",
    "```",
    "```fitness-today",
    "```",
    "```fitness-dashboard",
    "```",
    "```fitness-actions",
    "```",
    "```fitness-golf-cues",
    "```",
    "```fitness-cues",
    "```",
    "```fitness-gym-cues",
    "```",
    "",
  ].join("\n");

  const { markdown, replacements } = rewriteFitnessFences(src);

  assert.equal(replacements, 7);
  assert.match(markdown, /```atomic-heatmap\n/);
  assert.match(markdown, /```atomic-today\n/);
  assert.match(markdown, /```atomic-dashboard\n/);
  assert.match(markdown, /```atomic-actions\n/);
  assert.match(markdown, /```atomic-golf-cues\n/);
  assert.match(markdown, /```atomic-gym-cues\n/);
  assert.doesNotMatch(markdown, /```fitness-/);
});

test("rewriteFitnessFences preserves fence style and info string suffix", () => {
  const src = "  ~~~fitness-heatmap extra\nyear: 2026\n  ~~~\n";
  const { markdown, replacements } = rewriteFitnessFences(src);

  assert.equal(replacements, 1);
  assert.equal(markdown, "  ~~~atomic-heatmap extra\nyear: 2026\n  ~~~\n");
});

test("rewriteFitnessFences ignores nested fences inside documentation samples", () => {
  const src = [
    "````markdown",
    "```fitness-heatmap",
    "```",
    "````",
    "",
    "```fitness-cues",
    "```",
    "",
  ].join("\n");

  const { markdown, replacements } = rewriteFitnessFences(src);

  assert.equal(replacements, 1);
  assert.match(markdown, /````markdown\n```fitness-heatmap\n/);
  assert.match(markdown, /\n```atomic-golf-cues\n/);
});

test("rewriteFitnessFences is idempotent for atomic fences", () => {
  const src = "```atomic-heatmap\n```\n";
  assert.deepEqual(rewriteFitnessFences(src), {
    markdown: src,
    replacements: 0,
  });
});
