import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEMO_AUTHORS,
  FORBIDDEN_PUBLISHER_TITLES,
  OPEN_COVER_TITLE,
  TIMER_ITEM_TITLE,
  assertOriginalDemoNotes,
  patchReadingItems,
  writeUserGuideNotes,
} from "../scripts/prepare-user-guide-vault.mjs";

test("demo titles used in user-guide shots are original", () => {
  const titles = Object.keys(DEMO_AUTHORS);
  assert.ok(titles.includes(TIMER_ITEM_TITLE));
  assert.ok(titles.includes(OPEN_COVER_TITLE));
  for (const title of titles) {
    assert.equal(FORBIDDEN_PUBLISHER_TITLES.includes(title), false);
  }
  assert.ok(FORBIDDEN_PUBLISHER_TITLES.includes("Atomic Habits"));
  assert.ok(FORBIDDEN_PUBLISHER_TITLES.includes("How to Read a Book"));
});

test("patchReadingItems writes invented authors and local covers", () => {
  const vault = mkdtempSync(join(tmpdir(), "atomic-guide-notes-"));
  try {
    const items = join(vault, "atomics/hobbies/Reading/Items");
    mkdirSync(items, { recursive: true });
    writeFileSync(
      join(items, `${TIMER_ITEM_TITLE}.md`),
      `---
authors:
  - James Clear
cover: "https://covers.openlibrary.org/b/id/12539702-L.jpg"
---

# ${TIMER_ITEM_TITLE}
`,
    );
    writeFileSync(
      join(items, `${OPEN_COVER_TITLE}.md`),
      `---
authors:
  - ""
cover: ""
---

# ${OPEN_COVER_TITLE}
`,
    );
    writeUserGuideNotes(vault);
    patchReadingItems(vault);
    assertOriginalDemoNotes(vault);

    const timer = readFileSync(join(items, `${TIMER_ITEM_TITLE}.md`), "utf8");
    assert.match(timer, /Mara Ellison/);
    assert.match(timer, /the-unhurried-advantage\.png/);
    assert.match(timer, /timer_started_at: "2026-08-11T14:20:00.000Z"/);
    assert.doesNotMatch(timer, /openlibrary/i);

    const shelf = readFileSync(
      join(vault, "atomics/hobbies/Reading/Book Shelf.md"),
      "utf8",
    );
    assert.match(shelf, /atomic-bookshelf/);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
