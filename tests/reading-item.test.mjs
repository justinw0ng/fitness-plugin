import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHobbyItemPath,
  buildReadingItemPath,
  readingItemMarkdown,
} from "../src/commands/hobby-item.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("buildHobbyItemPath creates safe hobby item paths", () => {
  assert.equal(
    buildHobbyItemPath("atomics/hobbies/Chess", "Sicilian Defense"),
    "atomics/hobbies/Chess/Items/Sicilian Defense.md",
  );
  assert.throws(
    () => buildHobbyItemPath("../Chess", "Sicilian Defense"),
    /Hobby folder must be a safe vault-relative folder/,
  );
});

test("buildReadingItemPath creates safe Reading item paths", () => {
  assert.equal(
    buildReadingItemPath("atomics/hobbies/Reading", "Atomic Habits"),
    "atomics/hobbies/Reading/Items/Atomic Habits.md",
  );
  assert.equal(
    buildReadingItemPath("atomics/hobbies/Reading", "../Atomic/Habits"),
    "atomics/hobbies/Reading/Items/Atomic Habits.md",
  );
  assert.equal(
    buildReadingItemPath("atomics/hobbies/Reading", ""),
    "atomics/hobbies/Reading/Items/Untitled Book.md",
  );
  assert.throws(
    () => buildReadingItemPath("../Reading", "Atomic Habits"),
    /Hobby folder must be a safe vault-relative folder/,
  );
});

test("readingItemMarkdown includes Bases fields, timer fields, and atomic-timer block", () => {
  const markdown = readingItemMarkdown("Atomic Habits");

  assert.match(markdown, /^---\n/);
  assert.match(markdown, /type: atomic-item\n/);
  assert.match(markdown, /domain: hobby\n/);
  assert.match(markdown, /activity: reading\n/);
  assert.match(markdown, /status: to-read\n/);
  assert.match(markdown, /authors:\n  - ""\n/);
  assert.match(markdown, /description: ""\n/);
  assert.match(markdown, /pages:\n/);
  assert.match(markdown, /cover: ""\n/);
  assert.match(markdown, /spine_color:\n/);
  assert.match(markdown, /total_min: 0\n/);
  assert.match(markdown, /timer_started_at:\n/);
  assert.match(markdown, /related_canvas:\n/);
  assert.match(markdown, /## Remarks\n\n/);
  assert.match(markdown, /## Time log\n\n/);
  assert.match(markdown, /```atomic-timer\n```\n/);
});

test("readingItemMarkdown parameterizes activity id for general hobbies", () => {
  const markdown = readingItemMarkdown("Sicilian Defense", "en", "chess");
  assert.match(markdown, /activity: chess\n/);
});

test("create reading/hobby item and timer stop use Obsidian promptText, not window.prompt", () => {
  const reading = readFileSync(
    join(root, "src/commands/create-reading-item.ts"),
    "utf8",
  );
  const timer = readFileSync(join(root, "src/views/timer.ts"), "utf8");
  const bookshelf = readFileSync(
    join(root, "src/hobbies/reading-bookshelf.ts"),
    "utf8",
  );
  const bookShelfHost = readFileSync(
    join(root, "src/hobbies/book-shelf-host.ts"),
    "utf8",
  );
  assert.match(reading, /promptText/);
  assert.doesNotMatch(reading, /window\.prompt/);
  assert.doesNotMatch(reading, /await import\(["']obsidian["']\)/);
  assert.match(timer, /promptText/);
  assert.doesNotMatch(timer, /window\.prompt/);
  assert.doesNotMatch(bookshelf, /await import\(["']obsidian["']\)/);
  assert.doesNotMatch(bookShelfHost, /await import\(["']obsidian["']\)/);
  assert.match(
    readFileSync(join(root, "src/util/notice.ts"), "utf8"),
    /require\(["']obsidian["']\)/,
  );
});
