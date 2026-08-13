import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HERO_BOOK_LIMIT,
  parseHeroBookLimit,
} from "../scripts/hero-capture-options.mjs";

test("parseHeroBookLimit defaults to 12", () => {
  assert.equal(DEFAULT_HERO_BOOK_LIMIT, 12);
  assert.equal(parseHeroBookLimit([], 12), 12);
});

test("parseHeroBookLimit accepts a positive count within the catalog", () => {
  assert.equal(parseHeroBookLimit(["--book-limit", "3"], 12), 3);
  assert.equal(parseHeroBookLimit(["--book-limit=7"], 12), 7);
});

test("parseHeroBookLimit rejects missing, malformed, and out-of-range values", () => {
  assert.throws(
    () => parseHeroBookLimit(["--book-limit"], 12),
    /requires an integer/,
  );
  assert.throws(
    () => parseHeroBookLimit(["--book-limit", "three"], 12),
    /requires an integer/,
  );
  assert.throws(
    () => parseHeroBookLimit(["--book-limit", "0"], 12),
    /between 1 and 12/,
  );
  assert.throws(
    () => parseHeroBookLimit(["--book-limit=13"], 12),
    /between 1 and 12/,
  );
});

test("parseHeroBookLimit rejects unknown arguments", () => {
  assert.throws(
    () => parseHeroBookLimit(["--books", "3"], 12),
    /Unknown argument: --books/,
  );
});
