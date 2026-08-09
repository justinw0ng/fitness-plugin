import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_READING_NOTES_BASE_PATH,
  READING_ITEMS_FOLDER,
  isBasesCorePluginEnabled,
  needsReadingBookshelfUpgrade,
  readingBookshelfBaseYaml,
  shouldCreateReadingBookshelf,
} from "../src/hobbies/reading-bookshelf.ts";

test("readingBookshelfBaseYaml seeds Cards and Table views for Reading items", () => {
  const yaml = readingBookshelfBaseYaml(READING_ITEMS_FOLDER);

  assert.equal(
    DEFAULT_READING_NOTES_BASE_PATH,
    "atomics/hobbies/Reading/Reading Notes.base",
  );
  assert.match(yaml, /type: cards/);
  assert.match(yaml, /type: table/);
  assert.match(yaml, /atomics\/hobbies\/Reading\/Items/);
  assert.match(yaml, /image:\s*cover/);
  assert.match(yaml, /authors/);
  assert.match(yaml, /description/);
  assert.match(yaml, /pages/);
  assert.match(yaml, /status/);
  assert.match(yaml, /tags/);
  assert.match(yaml, /total_min/);
  assert.match(yaml, /'activity == "reading"'/);
  assert.match(yaml, /'type == "atomic-item"'/);
  assert.match(yaml, /'file\.inFolder\("atomics\/hobbies\/Reading\/Items"\)'/);
});

test("readingBookshelfBaseYaml uses Bases order keys (not fields/columns)", () => {
  const yaml = readingBookshelfBaseYaml(READING_ITEMS_FOLDER);

  assert.match(yaml, /^\s+order:\s*$/m);
  assert.doesNotMatch(yaml, /^\s+fields:\s*$/m);
  assert.doesNotMatch(yaml, /^\s+columns:\s*$/m);
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

test("isBasesCorePluginEnabled probes enabled plugin, plugins map, and config", () => {
  assert.equal(isBasesCorePluginEnabled({}), false);
  assert.equal(
    isBasesCorePluginEnabled({
      internalPlugins: {
        getEnabledPluginById: () => ({ id: "bases" }),
      },
    }),
    true,
  );
  assert.equal(
    isBasesCorePluginEnabled({
      internalPlugins: {
        getEnabledPluginById: () => null,
        plugins: { bases: { enabled: true } },
      },
    }),
    true,
  );
  assert.equal(
    isBasesCorePluginEnabled({
      internalPlugins: {
        getEnabledPluginById: () => null,
        config: { bases: true },
      },
    }),
    true,
  );
  assert.equal(
    isBasesCorePluginEnabled({
      internalPlugins: {
        getEnabledPluginById: () => null,
        getPluginById: () => ({ enabled: true }),
      },
    }),
    true,
  );
});

test("needsReadingBookshelfUpgrade detects broken fields/columns seed", () => {
  const broken = `# Reading bookshelf v1
filters:
  and:
    - file.inFolder("atomics/hobbies/Reading/Items")
views:
  - type: cards
    name: Cards
    image: cover
    fields:
      - file.name
  - type: table
    name: Table
    columns:
      - file.name
`;
  assert.equal(needsReadingBookshelfUpgrade(broken), true);

  const valid = readingBookshelfBaseYaml(READING_ITEMS_FOLDER);
  assert.equal(needsReadingBookshelfUpgrade(valid), false);

  const customized = `filters:
  and:
    - 'file.inFolder("atomics/hobbies/Reading/Items")'
views:
  - type: cards
    name: Cards
    image: cover
    order:
      - file.name
      - authors
`;
  assert.equal(needsReadingBookshelfUpgrade(customized), false);
});
