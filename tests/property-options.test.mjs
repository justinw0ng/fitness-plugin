import test from "node:test";
import assert from "node:assert/strict";
import {
  DROPDOWN_PROPERTY_NAMES,
  resolvePropertyOptions,
} from "../src/core/property-options.ts";

const readingItem = {
  type: "atomic-item",
  activity: "reading",
};

const golfSession = {
  type: "session",
  activity: "golf",
};

const gymSession = {
  type: "session",
  activity: "gym",
};

test("resolvePropertyOptions exposes reading status on Reading items", () => {
  const spec = resolvePropertyOptions("status", { frontmatter: readingItem });
  assert.ok(spec);
  assert.deepEqual(spec.values, [
    "to-read",
    "reading",
    "to-read-again",
    "finished",
  ]);
});

test("resolvePropertyOptions exposes golf felt and location on golf sessions", () => {
  assert.deepEqual(resolvePropertyOptions("felt", { frontmatter: golfSession })?.values, [
    "good",
    "ok",
    "bad",
  ]);
  assert.deepEqual(
    resolvePropertyOptions("location", { frontmatter: golfSession })?.values,
    ["Home net", "Driving range", "Course", "Other"],
  );
});

test("resolvePropertyOptions exposes gym location and weight unit on gym sessions", () => {
  assert.deepEqual(
    resolvePropertyOptions("location", { frontmatter: gymSession })?.values,
    ["Home", "Commercial", "Hotel/Travel", "Other"],
  );
  assert.deepEqual(resolvePropertyOptions("weight_unit", { frontmatter: gymSession })?.values, [
    "kg",
    "lb",
  ]);
});

test("resolvePropertyOptions skips mismatched note types", () => {
  assert.equal(resolvePropertyOptions("status", { frontmatter: golfSession }), null);
  assert.equal(resolvePropertyOptions("felt", { frontmatter: readingItem }), null);
  assert.equal(resolvePropertyOptions("weight_unit", { frontmatter: golfSession }), null);
});

test("DROPDOWN_PROPERTY_NAMES lists every dropdown property key", () => {
  assert.deepEqual([...DROPDOWN_PROPERTY_NAMES].sort(), [
    "felt",
    "location",
    "status",
    "weight_unit",
  ]);
});
