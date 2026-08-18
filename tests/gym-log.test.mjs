import test from "node:test";
import assert from "node:assert/strict";
import {
  appendSetRow,
  extractExercisePairs,
  formatSetTableRow,
  gymExercisePairKey,
  gymExercisePairLabel,
  gymExercisePairValue,
  hasGymLogBlock,
  insertGymLogFence,
  isDailySessionPath,
  isGymLogMigrationTarget,
  isGymLogSetup,
  mergeGymExercises,
  normalizeGymExercisePair,
  normalizeGymExercises,
  parseGymExercisePairValue,
  planGymLogSetup,
  sanitizeSetTableCell,
} from "../src/core/gym-log.ts";

const TABLE = `| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 80 | 5 | |
| Bench | Chest | 60 | 8 | pause |`;

const FENCE = "```atomic-gym-log\n# No options.\n```";

test("gymExercisePair helpers round-trip and label pairs", () => {
  const pair = { exercise: "Squat", muscle: "Quads" };
  assert.equal(gymExercisePairLabel(pair), "Squat · Quads");
  assert.equal(gymExercisePairValue(pair), JSON.stringify(["Squat", "Quads"]));
  assert.deepEqual(parseGymExercisePairValue(JSON.stringify(["Squat", "Quads"])), pair);
  assert.equal(parseGymExercisePairValue("__atomic_new_exercise__"), null);
  assert.equal(parseGymExercisePairValue("Squat"), null);
  assert.equal(gymExercisePairKey(pair), gymExercisePairKey({ exercise: " squat ", muscle: "QUADS" }));
});

test("normalizeGymExercises drops incomplete pairs and de-duplicates", () => {
  assert.deepEqual(normalizeGymExercises(null), []);
  assert.deepEqual(
    normalizeGymExercises([
      { exercise: "Bench", muscle: "Chest" },
      { exercise: "bench", muscle: "chest" },
      { exercise: "  ", muscle: "Back" },
      { muscle: "Quads" },
      { exercise: "Squat", muscle: "Quads" },
    ]),
    [
      { exercise: "Bench", muscle: "Chest" },
      { exercise: "Squat", muscle: "Quads" },
    ],
  );
  assert.equal(normalizeGymExercisePair("Squat"), null);
  assert.equal(isGymLogSetup("pending"), true);
  assert.equal(isGymLogSetup("done"), false);
});

test("extractExercisePairs reads unique filled table rows", () => {
  const withBlanks = `| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 80 | 5 | |
|  |  |  |  |  |
| Bench | Chest | 60 | 8 | |
| Pull-up |  | BW | 6 | |`;
  assert.deepEqual(extractExercisePairs(withBlanks), [
    { exercise: "Bench", muscle: "Chest" },
    { exercise: "Squat", muscle: "Quads" },
  ]);
});

test("mergeGymExercises keeps first spelling and sorts", () => {
  const merged = mergeGymExercises(
    [{ exercise: "Squat", muscle: "Quads" }],
    [{ exercise: "squat", muscle: "quads" }, { exercise: "Deadlift", muscle: "Hamstrings" }],
  );
  assert.deepEqual(merged, [
    { exercise: "Deadlift", muscle: "Hamstrings" },
    { exercise: "Squat", muscle: "Quads" },
  ]);
});

test("sanitizeSetTableCell strips pipes and newlines", () => {
  assert.equal(sanitizeSetTableCell("pause | 2s\nnext"), "pause / 2s next");
  assert.equal(
    formatSetTableRow({ exercise: "A|B", muscle: "Chest", weight: 60, reps: 8, notes: "ok" }),
    "| A/B | Chest | 60 | 8 | ok |",
  );
});

test("appendSetRow fills the first empty template row", () => {
  const markdown = `# Gym

| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
`;
  const result = appendSetRow(markdown, {
    exercise: "Squat",
    muscle: "Quads",
    weight: 80,
    reps: 5,
    notes: "deep",
  });
  assert.equal(result.filledEmpty, true);
  assert.match(result.markdown, /\| Squat \| Quads \| 80 \| 5 \| deep \|/);
  assert.equal(result.markdown.split("\n").filter((line) => line.startsWith("|  |")).length, 1);
});

test("appendSetRow appends after filled rows and creates a table when missing", () => {
  const appended = appendSetRow(TABLE, {
    exercise: "Pull-up",
    muscle: "Back",
    weight: "BW",
    reps: 6,
    notes: "",
  });
  assert.equal(appended.filledEmpty, false);
  assert.match(appended.markdown, /\| Pull-up \| Back \| BW \| 6 \|  \|/);

  const created = appendSetRow("# Gym\n", {
    exercise: "Squat",
    muscle: "Quads",
    weight: 80,
    reps: 5,
    notes: "",
  });
  assert.match(created.markdown, /\| Exercise \| Muscle \| Weight \| Reps \| Notes \|/);
  assert.match(created.markdown, /\| Squat \| Quads \| 80 \| 5 \|  \|/);
});

test("insertGymLogFence is idempotent and sits above the table", () => {
  const first = insertGymLogFence(`# Gym\n\n${TABLE}\n`, FENCE);
  assert.equal(first.changed, true);
  assert.equal(hasGymLogBlock(first.markdown), true);
  assert.match(first.markdown, /```atomic-gym-log[\s\S]*\| Exercise \| Muscle \|/);

  const second = insertGymLogFence(first.markdown, FENCE);
  assert.equal(second.changed, false);
  assert.equal(second.markdown, first.markdown);
});

test("insertGymLogFence adds a table when a dated session has none", () => {
  const result = insertGymLogFence("# Gym — 2026-08-18\n", FENCE);
  assert.equal(result.changed, true);
  assert.match(result.markdown, /```atomic-gym-log/);
  assert.match(result.markdown, /\| Exercise \| Muscle \|/);
});

test("planGymLogSetup seeds pairs and rewrites session notes only", () => {
  const plan = planGymLogSetup(
    [
      {
        path: "atomics/exercise/Gym/2026/2026-08-18.md",
        markdown: `# Gym\n\n${TABLE}\n`,
      },
      {
        path: "atomics/exercise/Gym/Cues.md",
        markdown: "# Cues\n",
      },
      {
        path: "atomics/exercise/Gym/2025/2025-12-01.md",
        markdown: "# Old gym\n",
      },
    ],
    FENCE,
  );
  assert.deepEqual(plan.pairs, [
    { exercise: "Bench", muscle: "Chest" },
    { exercise: "Squat", muscle: "Quads" },
  ]);
  assert.equal(plan.notes.length, 2);
  assert.equal(
    plan.notes.every((note) => hasGymLogBlock(note.nextMarkdown)),
    true,
  );
  assert.equal(isGymLogMigrationTarget("atomics/exercise/Gym/Cues.md"), false);
  assert.equal(isDailySessionPath("atomics/exercise/Gym/2026/2026-08-18.md"), true);
});
