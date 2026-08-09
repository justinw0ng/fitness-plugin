import test from "node:test";
import assert from "node:assert/strict";
import { createExerciseActivityType, createHobbyActivityType } from "../src/util/activity-types.ts";
import { resolveHeatmapActivities } from "../src/util/heatmap-activities.ts";

function sampleActivities() {
  const gym = createExerciseActivityType("Gym");
  gym.id = "gym";
  const golf = createExerciseActivityType("Golf");
  golf.id = "golf";
  const reading = createHobbyActivityType("Reading");
  reading.id = "reading";
  const chess = createHobbyActivityType("Chess");
  chess.id = "chess";
  chess.enabled = false;
  return [gym, golf, reading, chess];
}

test("resolveHeatmapActivities defaults to all enabled activities", () => {
  const resolved = resolveHeatmapActivities(sampleActivities());
  assert.deepEqual(
    resolved.activities.map((activity) => activity.id),
    ["gym", "golf", "reading"],
  );
  assert.deepEqual(resolved.invalidIds, []);
});

test("resolveHeatmapActivities treats activity all as all enabled", () => {
  const resolved = resolveHeatmapActivities(sampleActivities(), "all");
  assert.deepEqual(
    resolved.activities.map((activity) => activity.id),
    ["gym", "golf", "reading"],
  );
});

test("resolveHeatmapActivities returns one activity by id", () => {
  const resolved = resolveHeatmapActivities(sampleActivities(), "reading");
  assert.deepEqual(
    resolved.activities.map((activity) => activity.id),
    ["reading"],
  );
  assert.deepEqual(resolved.invalidIds, []);
});

test("resolveHeatmapActivities returns multiple ids in order", () => {
  const resolved = resolveHeatmapActivities(sampleActivities(), "reading, gym");
  assert.deepEqual(
    resolved.activities.map((activity) => activity.id),
    ["reading", "gym"],
  );
});

test("resolveHeatmapActivities reports unknown and disabled ids", () => {
  const resolved = resolveHeatmapActivities(
    sampleActivities(),
    "reading, chess, swimming",
  );
  assert.deepEqual(
    resolved.activities.map((activity) => activity.id),
    ["reading"],
  );
  assert.deepEqual(resolved.invalidIds, ["chess", "swimming"]);
});

test("resolveHeatmapActivities treats mixed all+ids as all enabled", () => {
  const resolved = resolveHeatmapActivities(sampleActivities(), "gym, all, reading");
  assert.deepEqual(
    resolved.activities.map((activity) => activity.id),
    ["gym", "golf", "reading"],
  );
  assert.deepEqual(resolved.invalidIds, []);
});
