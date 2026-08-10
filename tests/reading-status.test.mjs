import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_READING_STATUS,
  READING_STATUSES,
  isReadingItemFrontmatter,
  readingStatusLabelKey,
  shouldUseReadingStatusDropdown,
  statusRank,
} from "../src/core/reading-status.ts";

test("READING_STATUSES lists the four workflow values", () => {
  assert.deepEqual(READING_STATUSES, [
    "to-read",
    "reading",
    "to-read-again",
    "finished",
  ]);
  assert.equal(DEFAULT_READING_STATUS, "to-read");
});

test("statusRank orders shelf groups with reading first", () => {
  assert.ok(statusRank("reading") < statusRank("to-read"));
  assert.ok(statusRank("to-read") < statusRank("to-read-again"));
  assert.ok(statusRank("to-read-again") < statusRank("finished"));
  assert.equal(statusRank("unknown"), 99);
});

test("isReadingItemFrontmatter matches atomic Reading items only", () => {
  assert.equal(
    isReadingItemFrontmatter({ type: "atomic-item", activity: "reading" }),
    true,
  );
  assert.equal(
    isReadingItemFrontmatter({ type: "atomic-item", activity: "chess" }),
    false,
  );
  assert.equal(isReadingItemFrontmatter({ activity: "reading" }), false);
  assert.equal(isReadingItemFrontmatter(null), false);
});

test("shouldUseReadingStatusDropdown scopes to status on Reading items", () => {
  const reading = { type: "atomic-item", activity: "reading" };
  assert.equal(shouldUseReadingStatusDropdown("status", reading), true);
  assert.equal(shouldUseReadingStatusDropdown("authors", reading), false);
  assert.equal(shouldUseReadingStatusDropdown("status", { activity: "reading" }), false);
});

test("readingStatusLabelKey maps known statuses to i18n keys", () => {
  assert.equal(readingStatusLabelKey("to-read"), "reading.status.toRead");
  assert.equal(readingStatusLabelKey("reading"), "reading.status.reading");
  assert.equal(readingStatusLabelKey("custom"), "custom");
});
