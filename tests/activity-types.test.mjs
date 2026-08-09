import test from "node:test";
import assert from "node:assert/strict";
import {
  createExerciseActivityType,
  createHobbyActivityType,
  defaultExerciseFolder,
  defaultHobbyFolder,
  hobbyActivities,
  resolveCueActivityType,
} from "../src/util/activity-types.ts";

const colors = ["#1", "#2", "#3", "#4"];

test("defaultExerciseFolder builds safe folders under atomics/exercise", () => {
  assert.equal(defaultExerciseFolder("Running"), "atomics/exercise/Running");
  assert.equal(defaultExerciseFolder("Badminton doubles"), "atomics/exercise/Badminton doubles");
  assert.equal(defaultExerciseFolder("../Golf"), "atomics/exercise/Golf");
  assert.equal(defaultExerciseFolder(""), "atomics/exercise/Exercise");
});

test("createExerciseActivityType creates a daily exercise with cues enabled", () => {
  const activity = createExerciseActivityType("Badminton doubles");

  assert.deepEqual(
    {
      id: activity.id,
      domain: activity.domain,
      label: activity.label,
      folder: activity.folder,
      noteModel: activity.noteModel,
      supportsCues: activity.supportsCues,
      supportsTimer: activity.supportsTimer,
      supportsSetTable: activity.supportsSetTable,
    },
    {
      id: "badminton-doubles",
      domain: "exercise",
      label: "Badminton doubles",
      folder: "atomics/exercise/Badminton doubles",
      noteModel: "dailySession",
      supportsCues: true,
      supportsTimer: false,
      supportsSetTable: false,
    },
  );
});

test("defaultHobbyFolder builds safe folders under atomics/hobbies", () => {
  assert.equal(defaultHobbyFolder("Reading"), "atomics/hobbies/Reading");
  assert.equal(defaultHobbyFolder("Model trains"), "atomics/hobbies/Model trains");
  assert.equal(defaultHobbyFolder("../Reading"), "atomics/hobbies/Reading");
  assert.equal(defaultHobbyFolder(""), "atomics/hobbies/Hobby");
});

test("createHobbyActivityType creates an item hobby with timer enabled and cues disabled", () => {
  const activity = createHobbyActivityType("Model trains");

  assert.deepEqual(
    {
      id: activity.id,
      domain: activity.domain,
      label: activity.label,
      folder: activity.folder,
      noteModel: activity.noteModel,
      supportsCues: activity.supportsCues,
      supportsTimer: activity.supportsTimer,
      supportsSetTable: activity.supportsSetTable,
    },
    {
      id: "model-trains",
      domain: "hobby",
      label: "Model trains",
      folder: "atomics/hobbies/Model trains",
      noteModel: "item",
      supportsCues: false,
      supportsTimer: true,
      supportsSetTable: false,
    },
  );
});

test("hobbyActivities returns timer item hobbies", () => {
  const activities = [
    createExerciseActivityType("Running"),
    createHobbyActivityType("Reading"),
  ];

  assert.deepEqual(hobbyActivities(activities).map((activity) => activity.id), ["reading"]);
});

test("resolveCueActivityType only returns cue-capable exercise activities", () => {
  const activities = [
    {
      id: "running",
      domain: "exercise",
      label: "Running",
      folder: "atomics/exercise/Running",
      colors,
      noteModel: "dailySession",
      supportsCues: false,
      supportsTimer: false,
      supportsSetTable: false,
    },
    {
      id: "badminton",
      domain: "exercise",
      label: "Badminton",
      folder: "atomics/exercise/Badminton",
      colors,
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
      colors,
      noteModel: "item",
      supportsCues: false,
      supportsTimer: true,
      supportsSetTable: false,
    },
  ];

  assert.equal(resolveCueActivityType(activities, "badminton")?.folder, "atomics/exercise/Badminton");
  assert.equal(resolveCueActivityType(activities, "running"), undefined);
  assert.equal(resolveCueActivityType(activities, "reading"), undefined);
});
