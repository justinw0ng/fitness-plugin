import test from "node:test";
import assert from "node:assert/strict";
import {
  codeblockLanguages,
  resolveCueActivity,
} from "../src/util/codeblock-languages.ts";

test("codeblockLanguages registers atomic languages only", () => {
  assert.deepEqual(codeblockLanguages(), [
    "atomic-heatmap",
    "atomic-today",
    "atomic-dashboard",
    "atomic-actions",
    "atomic-golf-cues",
    "atomic-gym-cues",
    "atomic-cues",
    "atomic-timer",
    "atomic-bookshelf",
  ]);
});

test("resolveCueActivity uses dedicated kind or atomic-cues activity option", () => {
  assert.equal(resolveCueActivity("atomic-golf-cues", {}), "golf");
  assert.equal(resolveCueActivity("atomic-gym-cues", {}), "gym");
  assert.equal(resolveCueActivity("atomic-cues", { activity: "gym" }), "gym");
  assert.equal(resolveCueActivity("atomic-cues", { activity: "golf" }), "golf");
});
