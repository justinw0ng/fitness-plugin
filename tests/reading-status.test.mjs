import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_READING_STATUS,
  READING_STATUSES,
  isReadingItemFrontmatter,
  matchesBookShelfStatus,
  readingStatusLabelKey,
  resolveBookShelfStatuses,
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

test("readingStatusLabelKey maps known statuses to i18n keys", () => {
  assert.equal(readingStatusLabelKey("to-read"), "reading.status.toRead");
  assert.equal(readingStatusLabelKey("reading"), "reading.status.reading");
  assert.equal(readingStatusLabelKey("custom"), "custom");
});

test("resolveBookShelfStatuses defaults to all statuses", () => {
  assert.deepEqual(resolveBookShelfStatuses(), { statuses: null, invalidStatuses: [] });
  assert.deepEqual(resolveBookShelfStatuses("all"), { statuses: null, invalidStatuses: [] });
  assert.deepEqual(resolveBookShelfStatuses(""), { statuses: null, invalidStatuses: [] });
});

test("resolveBookShelfStatuses accepts one or more status ids", () => {
  assert.deepEqual(resolveBookShelfStatuses("reading"), {
    statuses: ["reading"],
    invalidStatuses: [],
  });
  assert.deepEqual(resolveBookShelfStatuses("reading, to-read"), {
    statuses: ["reading", "to-read"],
    invalidStatuses: [],
  });
  assert.deepEqual(resolveBookShelfStatuses("READING, reading"), {
    statuses: ["reading"],
    invalidStatuses: [],
  });
});

test("resolveBookShelfStatuses reports unknown status tokens", () => {
  assert.deepEqual(resolveBookShelfStatuses("reading, archived"), {
    statuses: ["reading"],
    invalidStatuses: ["archived"],
  });
});

test("matchesBookShelfStatus filters only when statuses are set", () => {
  assert.equal(matchesBookShelfStatus("reading", null), true);
  assert.equal(matchesBookShelfStatus("finished", ["reading"]), false);
  assert.equal(matchesBookShelfStatus("reading", ["reading", "to-read"]), true);
});
