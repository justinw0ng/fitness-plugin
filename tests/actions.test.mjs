import test from "node:test";
import assert from "node:assert/strict";
import {
  createExerciseActivityType,
  createHobbyActivityType,
} from "../src/util/activity-types.ts";
import { actionActivities } from "../src/util/action-activities.ts";

test("actionActivities includes enabled exercise and hobby habits", () => {
  const gym = createExerciseActivityType("Gym");
  const golf = createExerciseActivityType("Golf");
  golf.supportsSetTable = false;
  const reading = createHobbyActivityType("Reading");
  const chess = createHobbyActivityType("Chess");
  const disabled = createHobbyActivityType("Paused");
  disabled.enabled = false;

  const ids = actionActivities([gym, golf, reading, chess, disabled]).map(
    (activity) => activity.id,
  );
  assert.deepEqual(ids, ["gym", "golf", "reading", "chess"]);
});

test("actionActivities returns empty when no habits enabled", () => {
  const gym = createExerciseActivityType("Gym");
  gym.enabled = false;
  assert.deepEqual(actionActivities([gym]), []);
});
