import test from "node:test";
import assert from "node:assert/strict";
import {
  codeblockLanguages,
  resolveCodeblockKind,
  resolveCueActivity,
} from "../src/util/codeblock-languages.ts";

test("codeblockLanguages always includes atomic languages", () => {
  assert.deepEqual(codeblockLanguages(false), [
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

test("codeblockLanguages includes fitness aliases while legacy blocks are enabled", () => {
  assert.deepEqual(codeblockLanguages(true), [
    "atomic-heatmap",
    "atomic-today",
    "atomic-dashboard",
    "atomic-actions",
    "atomic-golf-cues",
    "atomic-gym-cues",
    "atomic-cues",
    "atomic-timer",
    "atomic-bookshelf",
    "fitness-heatmap",
    "fitness-today",
    "fitness-dashboard",
    "fitness-actions",
    "fitness-golf-cues",
    "fitness-gym-cues",
    "fitness-cues",
  ]);
});

test("resolveCodeblockKind maps fitness aliases to atomic renderers", () => {
  assert.equal(resolveCodeblockKind("fitness-heatmap"), "atomic-heatmap");
  assert.equal(resolveCodeblockKind("fitness-actions"), "atomic-actions");
  assert.equal(resolveCodeblockKind("fitness-cues"), "atomic-golf-cues");
  assert.equal(resolveCodeblockKind("atomic-cues"), "atomic-cues");
});

test("resolveCueActivity uses dedicated kind or atomic-cues activity option", () => {
  assert.equal(resolveCueActivity("atomic-golf-cues", {}), "golf");
  assert.equal(resolveCueActivity("atomic-gym-cues", {}), "gym");
  assert.equal(resolveCueActivity("atomic-cues", { activity: "gym" }), "gym");
  assert.equal(resolveCueActivity("atomic-cues", { activity: "golf" }), "golf");
});
