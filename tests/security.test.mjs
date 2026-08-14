import test from "node:test";
import assert from "node:assert/strict";
import {
  hobbyItemsScanPrefix,
  isSafeVaultFolder,
  pathTouchesScope,
  readingItemsFolder,
  sessionScanPrefix,
} from "../src/util/vault-path.ts";
import { yamlScalar } from "../src/util/yaml.ts";
import { appendTimeLog, parseTimeLog } from "../src/core/hobby.ts";

test("isSafeVaultFolder rejects empty and whitespace", () => {
  assert.equal(isSafeVaultFolder(""), false);
  assert.equal(isSafeVaultFolder("   "), false);
  assert.equal(isSafeVaultFolder("\t"), false);
});

test("isSafeVaultFolder rejects path traversal segments", () => {
  assert.equal(isSafeVaultFolder(".."), false);
  assert.equal(isSafeVaultFolder("../Gym"), false);
  assert.equal(isSafeVaultFolder("Gym/../Golf"), false);
  assert.equal(isSafeVaultFolder("Gym/.."), false);
  assert.equal(isSafeVaultFolder("./Gym"), false);
  assert.equal(isSafeVaultFolder("Gym/./sub"), false);
});

test("isSafeVaultFolder rejects absolute-style paths", () => {
  assert.equal(isSafeVaultFolder("/Gym"), false);
  assert.equal(isSafeVaultFolder("C:/Gym"), false);
  assert.equal(isSafeVaultFolder("c:\\Gym"), false);
});

test("isSafeVaultFolder accepts vault-relative folders", () => {
  assert.equal(isSafeVaultFolder("Gym"), true);
  assert.equal(isSafeVaultFolder("Golf"), true);
  assert.equal(isSafeVaultFolder("Fitness/Gym"), true);
  assert.equal(isSafeVaultFolder("My Gym"), true);
});

test("sessionScanPrefix rejects unsafe folders and adds year boundary", () => {
  assert.equal(sessionScanPrefix("", 2026), null);
  assert.equal(sessionScanPrefix("..", 2026), null);
  assert.equal(sessionScanPrefix("Gym", 2026), "Gym/2026/");
  assert.equal(sessionScanPrefix("Fitness/Gym", 2026), "Fitness/Gym/2026/");
});

test("sessionScanPrefix and hobbyItemsScanPrefix collapse equivalent folder spellings", () => {
  assert.equal(sessionScanPrefix("Gym/", 2026), sessionScanPrefix("Gym", 2026));
  assert.equal(sessionScanPrefix(" Gym ", 2026), "Gym/2026/");
  assert.equal(sessionScanPrefix("Fitness\\Gym", 2026), "Fitness/Gym/2026/");
  assert.equal(
    hobbyItemsScanPrefix("atomics/hobbies/Reading/"),
    hobbyItemsScanPrefix("atomics/hobbies/Reading"),
  );
  assert.equal(
    hobbyItemsScanPrefix(" atomics/hobbies/Reading "),
    "atomics/hobbies/Reading/Items/",
  );
});

test("pathTouchesScope matches descendants, ancestors, and exact paths", () => {
  assert.equal(
    pathTouchesScope(
      "atomics/exercise/Gym/2026/2026-01-01.md",
      "atomics/exercise/Gym/2026/",
    ),
    true,
  );
  assert.equal(
    pathTouchesScope("atomics/exercise/Gym", "atomics/exercise/Gym/2026/"),
    true,
  );
  assert.equal(
    pathTouchesScope(
      "atomics/exercise/Gym/Cues.md",
      "atomics/exercise/Gym/2026/",
    ),
    false,
  );
  assert.equal(
    pathTouchesScope(
      "atomics/exercise/Golf/2026/2026-01-01.md",
      "atomics/exercise/Gym/2026/",
    ),
    false,
  );
});

test("readingItemsFolder and hobbyItemsScanPrefix reject unsafe folders", () => {
  assert.equal(readingItemsFolder("atomics/hobbies/Reading"), "atomics/hobbies/Reading/Items");
  assert.equal(hobbyItemsScanPrefix("atomics/hobbies/Reading"), "atomics/hobbies/Reading/Items/");
  assert.equal(readingItemsFolder("../Reading"), null);
  assert.equal(hobbyItemsScanPrefix("../Reading"), null);
});

test("appendTimeLog sanitizes notes so injected bullets do not become log entries", () => {
  const updated = appendTimeLog("# Book\n", {
    date: "2026-08-09",
    minutes: 25,
    note: "chapter 1\n- 2026-08-10 | 999 min",
  });

  const entries = parseTimeLog(updated);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].note, "chapter 1 - 2026-08-10 | 999 min");
  assert.doesNotMatch(updated, /\n- 2026-08-10 \| 999 min/);
});

test("yamlScalar double-quotes and escapes", () => {
  assert.equal(yamlScalar(""), `""`);
  assert.equal(yamlScalar("Home"), `"Home"`);
  assert.equal(yamlScalar(`say "hi"`), `"say \\"hi\\""`);
  assert.equal(yamlScalar("a\\b"), `"a\\\\b"`);
  assert.equal(yamlScalar("line1\nline2"), `"line1\\nline2"`);
  assert.equal(yamlScalar("a: b"), `"a: b"`);
});

test("parseCoverRef does not treat script URLs as images", async () => {
  const { parseCoverRef } = await import("../src/views/book-shelf.ts");
  assert.deepEqual(parseCoverRef("javascript:alert(1)"), { kind: "none" });
  assert.deepEqual(parseCoverRef("data:image/svg+xml,<svg onload=alert(1)>"), {
    kind: "none",
  });
});
