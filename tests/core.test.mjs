import test from "node:test";
import assert from "node:assert/strict";
import {
  LB_TO_KG,
  normalizeCue,
  durationToLevel,
  isLoadedWeight,
  toKg,
  rowVolumeKg,
  parseSetTable,
  yearFromDailyPath,
  buildKeepers,
  cuesInCalendarMonth,
  parseReminders,
} from "../src/core.ts";

test("exports expected helpers", () => {
  assert.equal(typeof normalizeCue, "function");
  assert.equal(typeof durationToLevel, "function");
  assert.equal(typeof isLoadedWeight, "function");
  assert.equal(typeof toKg, "function");
  assert.equal(typeof rowVolumeKg, "function");
  assert.equal(typeof parseSetTable, "function");
  assert.equal(typeof yearFromDailyPath, "function");
  assert.equal(typeof buildKeepers, "function");
  assert.equal(typeof cuesInCalendarMonth, "function");
  assert.equal(typeof parseReminders, "function");
});

test("isLoadedWeight rejects BW and empties", () => {
  assert.equal(isLoadedWeight("BW"), false);
  assert.equal(isLoadedWeight("—"), false);
  assert.equal(isLoadedWeight("-"), false);
  assert.equal(isLoadedWeight(""), false);
  assert.equal(isLoadedWeight(null), false);
  assert.equal(isLoadedWeight(60), true);
  assert.equal(isLoadedWeight("60"), true);
  assert.equal(isLoadedWeight("60.5"), true);
});

test("toKg converts lb", () => {
  assert.equal(toKg(100, "kg"), 100);
  assert.ok(Math.abs(toKg(100, "lb") - 100 * LB_TO_KG) < 1e-9);
});

test("rowVolumeKg skips non-loaded", () => {
  assert.equal(rowVolumeKg({ weight: "BW", reps: 10 }, "kg"), 0);
  assert.equal(rowVolumeKg({ weight: 60, reps: 8 }, "kg"), 480);
  assert.ok(Math.abs(rowVolumeKg({ weight: 100, reps: 5 }, "lb") - 500 * LB_TO_KG) < 1e-6);
});

test("parseSetTable reads rows", () => {
  const md = `
| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Bench | Chest | 60 | 8 | |
| Pull-up | Back | BW | 6 | warmup |
`;
  const rows = parseSetTable(md);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].exercise, "Bench");
  assert.equal(rows[0].muscle, "Chest");
  assert.equal(rows[0].weight, "60");
  assert.equal(rows[0].reps, "8");
  assert.equal(rows[1].weight, "BW");
});

test("durationToLevel buckets", () => {
  assert.equal(durationToLevel(0), 0);
  assert.equal(durationToLevel(null), 0);
  assert.equal(durationToLevel(15), 1);
  assert.equal(durationToLevel(30), 2);
  assert.equal(durationToLevel(60), 3);
  assert.equal(durationToLevel(90), 4);
});

test("yearFromDailyPath", () => {
  assert.equal(
    yearFromDailyPath("Daily/2025/Jun/2025-06-10.md", 2026),
    2025,
  );
  assert.equal(yearFromDailyPath("Inbox/note.md", 2026), 2026);
});

test("normalizeCue", () => {
  assert.equal(normalizeCue("  Keep  Lead Arm Soft "), "keep lead arm soft");
});

test("keepers require 2+ in year", () => {
  const cues = [
    { text: "Keep lead arm soft", date: "2026-01-02", focus: "Grip" },
    { text: "keep  lead arm soft", date: "2026-03-01", focus: "Grip" },
    { text: "One-off cue", date: "2026-02-01", focus: "Tempo" },
    { text: "Old repeat", date: "2025-01-01", focus: "Tempo" },
    { text: "Old repeat", date: "2025-02-01", focus: "Tempo" },
  ];
  const keepers = buildKeepers(cues, 2026);
  assert.equal(keepers.length, 1);
  assert.equal(keepers[0].key, "keep lead arm soft");
  assert.equal(keepers[0].count, 2);
  assert.equal(keepers[0].text, "keep  lead arm soft");
  assert.equal(keepers[0].lastSeen, "2026-03-01");
});

test("cuesInCalendarMonth", () => {
  const cues = [
    { text: "a", date: "2026-08-01" },
    { text: "b", date: "2026-07-31" },
    { text: "c", date: "2026-08-15" },
  ];
  const m = cuesInCalendarMonth(cues, 2026, 8);
  assert.deepEqual(m.map((x) => x.text), ["c", "a"]);
});

test("parseReminders extracts bullets under Reminders", () => {
  const md = `
# Golf — 2026-08-02

## Session log

- **Balls:** 80

## Reminders

- Keep lead arm soft at address
- Finish balanced on lead side

## Other

- ignore me
`;
  assert.deepEqual(parseReminders(md), [
    "Keep lead arm soft at address",
    "Finish balanced on lead side",
  ]);
});

test("parseReminders accepts bilingual emoji heading", () => {
  const md = `
# ⛳ Golf / 高爾夫 — 2026-08-08

## 💡 Reminders / 提醒

- Soft grip pressure
- 
- Finish tall

## Next

- ignore me
`;
  assert.deepEqual(parseReminders(md), [
    "Soft grip pressure",
    "Finish tall",
  ]);
});
