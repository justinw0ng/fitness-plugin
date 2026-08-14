import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeE2eVaultPath,
  E2E_FILES,
  pluginSettings,
  seedE2eVault,
} from "../e2e/lib/vault.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("assertSafeE2eVaultPath allows tmp vaults", () => {
  assertSafeE2eVaultPath("/tmp/atomic-tracker-e2e-vault");
  assertSafeE2eVaultPath(join(tmpdir(), "atomic-tracker-e2e-vault"));
  assertSafeE2eVaultPath(join(tmpdir(), "custom-seed-dir"));
});

test("assertSafeE2eVaultPath refuses empty, root, home, generic tmp, and repo paths", () => {
  assert.throws(() => assertSafeE2eVaultPath(""), /empty/);
  assert.throws(() => assertSafeE2eVaultPath("   "), /empty/);
  assert.throws(() => assertSafeE2eVaultPath("/"), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath("/tmp"), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath(homedir()), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath(repoRoot), /Refusing/);
  assert.throws(() => assertSafeE2eVaultPath(join(repoRoot, "e2e")), /inside the repository/);
  assert.throws(
    () => assertSafeE2eVaultPath("/var/log/atomic-notes"),
    /Refusing to wipe/,
  );
});

test("seedE2eVault writes health-check fixture notes without deploying the plugin", () => {
  const vault = mkdtempSync(join(tmpdir(), "atomic-e2e-seed-"));
  try {
    const { today, year } = seedE2eVault({
      vaultPath: vault,
      deployPlugin: false,
      today: "2026-08-13",
    });
    assert.equal(today, "2026-08-13");
    assert.equal(year, "2026");

    const heatmap = readFileSync(join(vault, E2E_FILES.heatmapReading), "utf8");
    assert.match(heatmap, /```atomic-heatmap/);
    assert.match(heatmap, /activity: reading/);

    const bookshelf = readFileSync(join(vault, E2E_FILES.bookshelfReading), "utf8");
    assert.match(bookshelf, /status: reading/);

    const scaled = readFileSync(join(vault, E2E_FILES.bookshelfScaled), "utf8");
    assert.match(scaled, /```atomic-bookshelf/);
    assert.match(scaled, /scale: 1.5/);

    const reading = readFileSync(join(vault, E2E_FILES.readingCurrent), "utf8");
    assert.match(reading, /status: reading/);
    assert.match(reading, /```atomic-timer/);

    const plugins = JSON.parse(
      readFileSync(join(vault, ".obsidian/community-plugins.json"), "utf8"),
    );
    assert.deepEqual(plugins, ["atomic-tracker"]);

    const core = JSON.parse(
      readFileSync(join(vault, ".obsidian/core-plugins.json"), "utf8"),
    );
    assert.equal(core.bases, true);
    assert.equal(core["command-palette"], true);

    const settings = JSON.parse(
      readFileSync(join(vault, ".obsidian/plugins/atomic-tracker/data.json"), "utf8"),
    );
    assert.equal(settings.language, "en");
    assert.deepEqual(
      settings.activityTypes.map((activity) => activity.id),
      pluginSettings().activityTypes.map((activity) => activity.id),
    );
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
