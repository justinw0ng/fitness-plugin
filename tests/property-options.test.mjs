import test from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOM_LOCATION_SENTINEL,
  DROPDOWN_PROPERTY_NAMES,
  gymCreateLocationNeedsDetail,
  resolveGymCreateLocation,
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

test("location specs allow custom values; other dropdowns do not", () => {
  assert.equal(
    resolvePropertyOptions("location", { frontmatter: gymSession })?.allowCustom,
    true,
  );
  assert.equal(
    resolvePropertyOptions("location", { frontmatter: golfSession })?.allowCustom,
    true,
  );
  assert.equal(
    resolvePropertyOptions("status", { frontmatter: readingItem })?.allowCustom,
    undefined,
  );
  assert.equal(
    resolvePropertyOptions("felt", { frontmatter: golfSession })?.allowCustom,
    undefined,
  );
  assert.equal(
    resolvePropertyOptions("weight_unit", { frontmatter: gymSession })?.allowCustom,
    undefined,
  );
});

test("CUSTOM_LOCATION_SENTINEL is stable and not a real location label", () => {
  assert.equal(CUSTOM_LOCATION_SENTINEL, "__atomic_custom_location__");
  assert.equal(
    resolvePropertyOptions("location", { frontmatter: gymSession })?.values.includes(
      CUSTOM_LOCATION_SENTINEL,
    ),
    false,
  );
});

test("resolveGymCreateLocation returns predefined selection unchanged", () => {
  assert.deepEqual(resolveGymCreateLocation("Home", undefined), {
    location: "Home",
    wasCustom: false,
    emptyCustomNotice: false,
  });
  assert.deepEqual(resolveGymCreateLocation("Other", undefined), {
    location: "Other",
    wasCustom: false,
    emptyCustomNotice: false,
  });
});

test("resolveGymCreateLocation trims custom location text", () => {
  assert.deepEqual(resolveGymCreateLocation(CUSTOM_LOCATION_SENTINEL, "  My gym  "), {
    location: "My gym",
    wasCustom: true,
    emptyCustomNotice: false,
  });
});

test("resolveGymCreateLocation empty custom prompt signals notice", () => {
  assert.deepEqual(resolveGymCreateLocation(CUSTOM_LOCATION_SENTINEL, "   "), {
    location: "",
    wasCustom: false,
    emptyCustomNotice: true,
  });
  assert.deepEqual(resolveGymCreateLocation(CUSTOM_LOCATION_SENTINEL, ""), {
    location: "",
    wasCustom: false,
    emptyCustomNotice: true,
  });
});

test("resolveGymCreateLocation custom cancel yields empty location", () => {
  assert.deepEqual(resolveGymCreateLocation(CUSTOM_LOCATION_SENTINEL, null), {
    location: "",
    wasCustom: false,
    emptyCustomNotice: false,
  });
});

test("resolveGymCreateLocation never returns the sentinel", () => {
  for (const customPromptRaw of [null, "", "  ", "Other", "Home"]) {
    const result = resolveGymCreateLocation(CUSTOM_LOCATION_SENTINEL, customPromptRaw);
    assert.notEqual(result.location, CUSTOM_LOCATION_SENTINEL);
  }
  assert.notEqual(resolveGymCreateLocation("Commercial", undefined).location, CUSTOM_LOCATION_SENTINEL);
});

test("gymCreateLocationNeedsDetail distinguishes custom Other from predefined Other", () => {
  assert.equal(gymCreateLocationNeedsDetail("Other", false), true);
  assert.equal(gymCreateLocationNeedsDetail("Other", true), false);
  assert.equal(gymCreateLocationNeedsDetail("Home", false), false);
  assert.equal(gymCreateLocationNeedsDetail("My gym", true), false);
});
