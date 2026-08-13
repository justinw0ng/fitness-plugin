import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DEMO_VAULT,
  DEFAULT_HERO_BOOK_LIMIT,
  parseHeroBookLimit,
  parseSeedVault,
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

test("parseSeedVault defaults to the demo vault and leaves other args", () => {
  assert.equal(DEFAULT_DEMO_VAULT, "/workspace/obsidian-demo");
  assert.deepEqual(parseSeedVault([]), {
    vault: DEFAULT_DEMO_VAULT,
    rest: [],
  });
  assert.deepEqual(parseSeedVault(["--book-limit", "3"]), {
    vault: DEFAULT_DEMO_VAULT,
    rest: ["--book-limit", "3"],
  });
});

test("parseSeedVault accepts --vault and --vault=", () => {
  assert.deepEqual(parseSeedVault(["--vault", "/tmp/guide-vault"]), {
    vault: "/tmp/guide-vault",
    rest: [],
  });
  assert.deepEqual(
    parseSeedVault(["--vault=/tmp/other", "--book-limit", "3"]),
    { vault: "/tmp/other", rest: ["--book-limit", "3"] },
  );
});

test("parseSeedVault rejects a missing path", () => {
  assert.throws(() => parseSeedVault(["--vault"]), /requires a path/);
  assert.throws(() => parseSeedVault(["--vault", "--book-limit"]), /requires a path/);
  assert.throws(() => parseSeedVault(["--vault="]), /requires a path/);
});
