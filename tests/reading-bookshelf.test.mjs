import test from "node:test";
import assert from "node:assert/strict";
import {
  READING_BOOKSHELF_REL,
  READING_ITEMS_FOLDER,
  readingBookshelfBaseYaml,
  shouldCreateReadingBookshelf,
} from "../src/hobbies/reading-bookshelf.ts";

test("readingBookshelfBaseYaml seeds Cards and Table views for Reading items", () => {
  const yaml = readingBookshelfBaseYaml(READING_ITEMS_FOLDER);

  assert.equal(READING_BOOKSHELF_REL, "atomics/hobbies/Reading/Bookshelf.base");
  assert.match(yaml, /type: cards/);
  assert.match(yaml, /type: table/);
  assert.match(yaml, /atomics\/hobbies\/Reading\/Items/);
  assert.match(yaml, /cover/);
  assert.match(yaml, /authors/);
  assert.match(yaml, /description/);
  assert.match(yaml, /pages/);
  assert.match(yaml, /status/);
  assert.match(yaml, /tags/);
  assert.match(yaml, /total_min/);
  assert.match(yaml, /activity == "reading"/);
  assert.match(yaml, /type == "atomic-item"/);
});

test("readingBookshelfBaseYaml rejects unsafe item folders", () => {
  assert.throws(
    () => readingBookshelfBaseYaml("../Reading/Items"),
    /safe vault-relative folder/,
  );
});

test("shouldCreateReadingBookshelf never clobbers an existing base", () => {
  assert.equal(shouldCreateReadingBookshelf(false), true);
  assert.equal(shouldCreateReadingBookshelf(true), false);
});
