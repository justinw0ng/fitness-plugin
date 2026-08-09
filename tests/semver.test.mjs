import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSemver,
  compareSemver,
  bumpSemver,
} from "../scripts/semver.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("parseSemver accepts x.y.z", () => {
  assert.deepEqual(parseSemver("1.2.3"), { major: 1, minor: 2, patch: 3 });
});

test("parseSemver rejects pre-release and junk", () => {
  assert.throws(() => parseSemver("1.0.0-beta"), /Expected x\.y\.z/);
  assert.throws(() => parseSemver("v1.0.0"), /Expected x\.y\.z/);
});

test("compareSemver orders versions", () => {
  assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
  assert.equal(compareSemver("1.0.1", "1.0.0"), 1);
  assert.equal(compareSemver("1.0.0", "1.0.1"), -1);
  assert.equal(compareSemver("1.1.0", "1.0.9"), 1);
  assert.equal(compareSemver("2.0.0", "1.9.9"), 1);
});

test("bumpSemver bumps each level", () => {
  assert.equal(bumpSemver("1.2.3", "patch"), "1.2.4");
  assert.equal(bumpSemver("1.2.3", "minor"), "1.3.0");
  assert.equal(bumpSemver("1.2.3", "major"), "2.0.0");
});

function writeVersionTree(dir, version) {
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify({ name: "fitness-plugin", version }, null, 2)}\n`,
  );
  writeFileSync(
    join(dir, "manifest.json"),
    `${JSON.stringify(
      {
        id: "obsidian-atomic",
        version,
        minAppVersion: "1.5.0",
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(dir, "versions.json"),
    `${JSON.stringify({ [version]: "1.5.0" }, null, 2)}\n`,
  );
  mkdirSync(join(dir, "scripts"), { recursive: true });
  for (const name of [
    "semver.mjs",
    "bump-version.mjs",
    "ensure-pr-version.mjs",
    "check-version-conflict.mjs",
  ]) {
    writeFileSync(
      join(dir, "scripts", name),
      readFileSync(join(repoRoot, "scripts", name), "utf8"),
    );
  }
}

function runScript(dir, script, args = []) {
  return spawnSync(process.execPath, [join(dir, "scripts", script), ...args], {
    cwd: dir,
    encoding: "utf8",
  });
}

test("ensure-pr-version bumps when equal to main", () => {
  const dir = mkdtempSync(join(tmpdir(), "ensure-pr-version-"));
  try {
    writeVersionTree(dir, "1.0.0");
    const result = runScript(dir, "ensure-pr-version.mjs", ["1.0.0"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "1.0.1");
    assert.equal(
      JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")).version,
      "1.0.1",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ensure-pr-version leaves newer versions alone", () => {
  const dir = mkdtempSync(join(tmpdir(), "ensure-pr-version-"));
  try {
    writeVersionTree(dir, "1.1.0");
    const result = runScript(dir, "ensure-pr-version.mjs", ["1.0.0"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "1.1.0");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ensure-pr-version fails when older than main", () => {
  const dir = mkdtempSync(join(tmpdir(), "ensure-pr-version-"));
  try {
    writeVersionTree(dir, "1.0.0");
    const result = runScript(dir, "ensure-pr-version.mjs", ["1.2.0"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /older than main/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-version-conflict fails for same or older", () => {
  const dir = mkdtempSync(join(tmpdir(), "check-version-"));
  try {
    writeVersionTree(dir, "1.0.0");
    const same = runScript(dir, "check-version-conflict.mjs", ["1.0.0"]);
    assert.equal(same.status, 1);
    assert.match(same.stderr, /same as main/);

    const older = runScript(dir, "check-version-conflict.mjs", ["2.0.0"]);
    assert.equal(older.status, 1);
    assert.match(older.stderr, /older than main/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-version-conflict passes when newer than main", () => {
  const dir = mkdtempSync(join(tmpdir(), "check-version-"));
  try {
    writeVersionTree(dir, "1.0.1");
    const result = runScript(dir, "check-version-conflict.mjs", ["1.0.0"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Version OK/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
