import test from "node:test";
import assert from "node:assert/strict";
import { parseBlockOptions } from "../src/util/parse-block.ts";
import { codeblockLanguages } from "../src/util/codeblock-languages.ts";
import {
  defaultAtomicBlockBody,
  defaultAtomicBlockFence,
  isAtomicBlockKind,
} from "../src/util/codeblock-defaults.ts";
import { bookShelfHostMarkdown } from "../src/hobbies/book-shelf-host.ts";
import { readingItemMarkdown } from "../src/commands/hobby-item.ts";

const ALL_KINDS = [
  "atomic-heatmap",
  "atomic-today",
  "atomic-dashboard",
  "atomic-actions",
  "atomic-golf-cues",
  "atomic-gym-cues",
  "atomic-cues",
  "atomic-timer",
  "atomic-bookshelf",
];

test("every registered UI codeblock has a default body with option comments", () => {
  assert.deepEqual(codeblockLanguages(), ALL_KINDS);
  for (const kind of ALL_KINDS) {
    assert.equal(isAtomicBlockKind(kind), true);
    const body = defaultAtomicBlockBody(kind, "en");
    assert.match(body, /^# /m);
    assert.match(body, /\n$/);
    const fence = defaultAtomicBlockFence(kind, "en");
    assert.equal(fence, `\`\`\`${kind}\n${body}\`\`\`\n`);
  }
});

test("default heatmap body documents every layout option as comments", () => {
  const body = defaultAtomicBlockBody("atomic-heatmap", "en");
  assert.match(body, /# Uncomment to customize/);
  assert.match(body, /# year: 2026  # calendar year/);
  assert.match(body, /# activity: all  # all \| id \| id1, id2/);
  assert.match(body, /# rows: 1  # preferred row count/);
  assert.match(body, /# columns: 1  # max columns/);
  assert.match(body, /# min-column-width: 300  # min px/);
  assert.match(body, /# default-span: 1.2  # CSS fr/);
  assert.deepEqual(parseBlockOptions(body), {});
});

test("default block values become active lines and stay parseable", () => {
  const body = defaultAtomicBlockBody("atomic-heatmap", "en", {
    activity: "gym, golf, guitar, reading",
    columns: "2",
    rows: "2",
  });
  assert.match(body, /^activity: gym, golf, guitar, reading  # /m);
  assert.match(body, /^rows: 2  # /m);
  assert.match(body, /^columns: 2  # /m);
  assert.match(body, /^# year: 2026  # /m);
  assert.deepEqual(parseBlockOptions(body), {
    activity: "gym, golf, guitar, reading",
    rows: "2",
    columns: "2",
  });
});

test("default bookshelf keeps activity active and documents status and scale", () => {
  const body = defaultAtomicBlockBody("atomic-bookshelf", "en");
  assert.match(body, /^activity: reading  # /m);
  assert.match(body, /# status: all  # all \| to-read \| reading \| to-read-again \| finished/);
  assert.match(body, /# scale: 1  # size multiplier 0\.25–4/);
  assert.deepEqual(parseBlockOptions(body), { activity: "reading" });
});

test("default cues require activity and document year", () => {
  const body = defaultAtomicBlockBody("atomic-cues", "en");
  assert.match(body, /^activity: golf  # required/m);
  assert.match(body, /# year: 2026  # calendar year/);
  assert.deepEqual(parseBlockOptions(body), { activity: "golf" });
});

test("optionless blocks only document that they have no options", () => {
  const actions = defaultAtomicBlockBody("atomic-actions", "en");
  const timer = defaultAtomicBlockBody("atomic-timer", "en");
  assert.match(actions, /# No options\. One button per enabled habit\./);
  assert.match(timer, /# No options\. Start \/ Stop \/ Resume \/ Discard/);
  assert.deepEqual(parseBlockOptions(actions), {});
  assert.deepEqual(parseBlockOptions(timer), {});
});

test("zh-Hant-en comments keep the Chinese half", () => {
  const body = defaultAtomicBlockBody("atomic-bookshelf", "zh-Hant-en");
  assert.match(body, /取消註解即可自訂/);
  assert.match(body, /預設 reading/);
  assert.match(body, /別名 ratio/);
});

test("newly created book shelf and reading item notes use the default fences", () => {
  assert.equal(
    bookShelfHostMarkdown("en"),
    defaultAtomicBlockFence("atomic-bookshelf", "en"),
  );
  const item = readingItemMarkdown("Atomic Habits", "en");
  assert.ok(item.endsWith(defaultAtomicBlockFence("atomic-timer", "en")));
});
