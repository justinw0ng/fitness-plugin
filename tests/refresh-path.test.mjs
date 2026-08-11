import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../src/types.ts";
import {
  collectAtomicDataRoots,
  pathAffectsAtomicRefresh,
} from "../src/util/refresh-path.ts";

test("collectAtomicDataRoots includes atomics, activity folders, and configured files", () => {
  const roots = collectAtomicDataRoots(DEFAULT_SETTINGS);
  assert.ok(roots.folderRoots.includes("atomics"));
  assert.ok(roots.folderRoots.includes("atomics/exercise/Gym"));
  assert.ok(roots.folderRoots.includes("atomics/hobbies/Reading"));
  assert.ok(roots.filePaths.includes("atomics/Dashboard.md"));
  assert.ok(roots.filePaths.includes("atomics/exercise/Golf/Cues.md"));
});

test("pathAffectsAtomicRefresh matches activity folders and live block hosts", () => {
  const roots = collectAtomicDataRoots(DEFAULT_SETTINGS);
  const live = ["My/Dashboard.md"];

  assert.equal(
    pathAffectsAtomicRefresh(
      "atomics/exercise/Gym/2026/2026-01-01.md",
      roots,
      live,
    ),
    true,
  );
  assert.equal(
    pathAffectsAtomicRefresh(
      "atomics/hobbies/Reading/Items/Book.md",
      roots,
      live,
    ),
    true,
  );
  assert.equal(
    pathAffectsAtomicRefresh("My/Dashboard.md", roots, live),
    true,
  );
  assert.equal(
    pathAffectsAtomicRefresh("Projects/notes.md", roots, live),
    false,
  );
  assert.equal(
    pathAffectsAtomicRefresh("atomics/Dashboard.md", roots, []),
    true,
  );
});
