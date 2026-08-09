import test from "node:test";
import assert from "node:assert/strict";
import {
  minutesByDateForYear,
  parseTimeLog,
  sumMinutesForYear,
} from "../src/core/hobby.ts";
import { HobbyTimeLogCache } from "../src/util/hobby-time-log-cache.ts";

const SAMPLE = `## Time log

- 2025-12-31 | 10 min | old year
- 2026-01-01 | 20 min | a
- 2026-01-01 | 5 min | b
- 2026-08-08 | 40 min | c
`;

test("minutesByDateForYear and sumMinutesForYear filter by calendar year", () => {
  const entries = parseTimeLog(SAMPLE);
  assert.deepEqual(
    [...minutesByDateForYear(entries, 2026).entries()].sort(),
    [
      ["2026-01-01", 25],
      ["2026-08-08", 40],
    ],
  );
  assert.equal(sumMinutesForYear(entries, 2026), 65);
  assert.equal(sumMinutesForYear(entries, 2025), 10);
  assert.equal(sumMinutesForYear(entries, 2024), 0);
});

test("HobbyTimeLogCache reuses parses for the same mtime and refreshes on change", () => {
  const cache = new HobbyTimeLogCache();
  const path = "atomics/hobbies/Reading/Items/Book.md";
  const entries = parseTimeLog(SAMPLE);

  assert.equal(cache.get(path, 100), null);
  cache.set(path, 100, entries);
  assert.equal(cache.get(path, 100), entries);
  assert.equal(cache.get(path, 101), null);

  cache.set(path, 101, []);
  assert.deepEqual(cache.get(path, 101), []);

  cache.rename(path, "atomics/hobbies/Reading/Items/Renamed.md");
  assert.equal(cache.get(path, 101), null);
  assert.deepEqual(cache.get("atomics/hobbies/Reading/Items/Renamed.md", 101), []);

  cache.invalidate("atomics/hobbies/Reading/Items/Renamed.md");
  assert.equal(cache.get("atomics/hobbies/Reading/Items/Renamed.md", 101), null);
  assert.equal(cache.size, 0);
});
