import test from "node:test";
import assert from "node:assert/strict";
import { parseTimeLog } from "../src/core/hobby.ts";
import {
  durationMapFromHobbyLogs,
  durationMapFromSessions,
} from "../src/util/duration-map.ts";
import { sessionMetaFromFile } from "../src/util/session-meta.ts";

test("sessionMetaFromFile uses frontmatter date and duration", () => {
  const meta = sessionMetaFromFile({
    path: "atomics/exercise/Gym/2026/note.md",
    basename: "note",
    frontmatter: { date: "2026-03-04", duration_min: 45, felt: "good" },
  });
  assert.equal(meta.date, "2026-03-04");
  assert.equal(meta.duration_min, 45);
  assert.equal(meta.felt, "good");
});

test("sessionMetaFromFile falls back to YYYY-MM-DD basename", () => {
  const meta = sessionMetaFromFile({
    path: "atomics/exercise/Gym/2026/2026-01-02.md",
    basename: "2026-01-02",
    frontmatter: undefined,
  });
  assert.equal(meta.date, "2026-01-02");
  assert.equal(meta.duration_min, 0);
});

test("durationMapFromSessions sums minutes per date", () => {
  const map = durationMapFromSessions([
    {
      path: "a.md",
      basename: "a",
      date: "2026-01-01",
      duration_min: 20,
      weight_unit: "kg",
      focus: [],
      felt: "",
    },
    {
      path: "b.md",
      basename: "b",
      date: "2026-01-01",
      duration_min: 15,
      weight_unit: "kg",
      focus: [],
      felt: "",
    },
  ]);
  assert.equal(map.get("2026-01-01")?.minutes, 35);
  assert.equal(map.get("2026-01-01")?.path, "a.md");
});

test("durationMapFromHobbyLogs keeps year-filtered totals", () => {
  const entries = parseTimeLog(`## Time log

- 2025-12-31 | 10 min
- 2026-01-01 | 20 min
- 2026-01-01 | 5 min
`);
  const map = durationMapFromHobbyLogs(
    [{ path: "book.md", entries }],
    2026,
  );
  assert.equal(map.get("2026-01-01")?.minutes, 25);
  assert.equal(map.get("2025-12-31"), undefined);
  assert.equal(map.get("2026-01-01")?.path, "book.md");
});
