import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readExample(rel) {
  return readFileSync(join(root, "examples", rel), "utf8");
}

test("daily note example includes bookshelf, actions, 2x2 heatmap, and today", () => {
  const md = readExample("daily-notes/2026-08-11.md");
  assert.match(md, /```atomic-bookshelf\n```/);
  assert.match(md, /```atomic-actions\n```/);
  assert.match(md, /```atomic-heatmap\nactivity: gym, golf, guitar, reading\ncolumns: 2\nrows: 2\nyear: 2026\n```/);
  assert.match(md, /```atomic-today\n```/);
});

test("dashboard example is the yearly atomic-dashboard note", () => {
  const md = readExample("dashboard/Dashboard.md");
  assert.match(md, /^---\nyear: 2026\n---/m);
  assert.match(md, /# Atomic Dashboard/);
  assert.match(md, /```atomic-dashboard\nyear: 2026\n```/);
});
