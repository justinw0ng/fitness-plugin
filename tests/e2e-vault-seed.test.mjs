import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { E2E_FILES, pluginSettings, seedE2eVault } from "../e2e/lib/vault.mjs";

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
