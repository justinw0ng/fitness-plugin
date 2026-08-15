import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAtomicBlockFence } from "../src/util/codeblock-defaults.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readExample(rel) {
  return readFileSync(join(root, "examples", rel), "utf8");
}

test("daily note example includes bookshelf, actions, 2x2 heatmap, and today", () => {
  const md = readExample("daily-notes/2026-08-11.md");
  assert.ok(md.includes(defaultAtomicBlockFence("atomic-bookshelf", "en")));
  assert.ok(md.includes(defaultAtomicBlockFence("atomic-actions", "en")));
  assert.ok(
    md.includes(
      defaultAtomicBlockFence("atomic-heatmap", "en", {
        year: "2026",
        activity: "gym, golf, guitar, reading",
        rows: "2",
        columns: "2",
      }),
    ),
  );
  assert.ok(md.includes(defaultAtomicBlockFence("atomic-today", "en")));
});

test("daily note template uses Obsidian date tokens and omits a hardcoded year", () => {
  const md = readExample("templates/Atomic daily note.md");
  assert.match(md, /# \{\{date:dddd, MMMM D, YYYY\}\}/);
  assert.ok(md.includes(defaultAtomicBlockFence("atomic-bookshelf", "en")));
  assert.ok(md.includes(defaultAtomicBlockFence("atomic-actions", "en")));
  assert.ok(
    md.includes(
      defaultAtomicBlockFence("atomic-heatmap", "en", {
        activity: "gym, golf, guitar, reading",
        rows: "2",
        columns: "2",
      }),
    ),
  );
  assert.ok(md.includes(defaultAtomicBlockFence("atomic-today", "en")));
  assert.doesNotMatch(md, /^year:\s*\d{4}/m);
});

test("dashboard example is the yearly atomic-dashboard note", () => {
  const md = readExample("dashboard/Dashboard.md");
  assert.match(md, /^---\nyear: 2026\n---/m);
  assert.match(md, /# Atomic Dashboard/);
  assert.ok(
    md.includes(defaultAtomicBlockFence("atomic-dashboard", "en", { year: "2026" })),
  );
});
