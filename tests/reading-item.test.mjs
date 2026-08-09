import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHobbyItemPath,
  buildReadingItemPath,
  readingItemMarkdown,
} from "../src/commands/create-reading-item.ts";

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
