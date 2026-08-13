/**
 * Deterministic Obsidian UI health check (Selenium + CDP).
 *
 * Keep this suite in sync with plugin UI. After any UI or breaking change,
 * update these tests and the data-testid hooks they use. Do not replace this
 * suite with computer-use; that is only for troubleshooting a failure.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { By } from "selenium-webdriver";
import { E2E_FILES, seedE2eVault } from "./lib/vault.mjs";
import {
  ARTIFACT_DIR,
  attachSelenium,
  closeSettings,
  e2eSkipReason,
  fillPrompt,
  launchObsidian,
  openAtomicSettings,
  openVaultFile,
  runCommand,
  saveScreenshot,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForNotice,
  waitForPlugin,
} from "./lib/obsidian.mjs";

const skipReason = e2eSkipReason();

async function shot(driver, name) {
  try {
    await saveScreenshot(driver, name);
  } catch {
    // ignore screenshot failures
  }
}

async function check(driver, name, fn) {
  try {
    await fn();
  } catch (error) {
    await shot(driver, name);
    throw error;
  }
}

describe("Obsidian Selenium health check", { skip: skipReason || undefined }, () => {
  let driver;
  let vaultPath;
  let today;

  before(async () => {
    const seeded = seedE2eVault();
    vaultPath = seeded.vault;
    today = seeded.today;
    await launchObsidian(vaultPath, E2E_FILES.heatmapAll);
    driver = await attachSelenium();
    await switchToObsidianWindow(driver);
    await waitForPlugin(driver);
  });

  after(async () => {
    await stopSession({ driver });
  });

  it("loads the enabled plugin", async () => {
    await check(driver, "plugin-enabled", async () => {
      const id = await driver.executeScript(
        `return app.plugins.plugins["atomic-tracker"]?.manifest?.id || null`,
      );
      assert.equal(id, "atomic-tracker");
    });
  });

  it("renders golf, gym, generic cues, timer, and bookshelf blocks", async () => {
    await check(driver, "codeblocks", async () => {
      await openVaultFile(driver, E2E_FILES.golfCues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="golf"]');

      await openVaultFile(driver, E2E_FILES.gymCues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="gym"]');

      await openVaultFile(driver, E2E_FILES.cues);
      await waitCss(driver, '[data-testid="atomic-cues"][data-activity="golf"]');

      await openVaultFile(driver, E2E_FILES.readingCurrent);
      await waitCss(driver, '[data-testid="atomic-timer"]');
      await waitCss(driver, '[data-testid="atomic-timer-start"]');

      await openVaultFile(driver, E2E_FILES.bookshelfAll);
      await waitCss(driver, '[data-testid="atomic-bookshelf"]');
      const books = await driver.findElements(By.css('[data-testid="atomic-book"]'));
      assert.equal(books.length, 2);
    });
  });

  it("filters heatmaps by activity", async () => {
    await check(driver, "heatmap-filters", async () => {
      await openVaultFile(driver, E2E_FILES.heatmapReading);
      await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="reading"]');
      const reading = await driver.findElements(By.css('[data-testid="atomic-heatmap"]'));
      assert.equal(reading.length, 1);
      const readingToday = await waitCss(
        driver,
        '[data-testid="atomic-heatmap"][data-activity="reading"] [data-testid="atomic-heatmap-today"]',
      );
      assert.equal(await readingToday.getAttribute("data-minutes"), "25");

      await openVaultFile(driver, E2E_FILES.heatmapGymGolf);
      await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="gym"]');
      await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="golf"]');
      const gymGolf = await driver.findElements(By.css('[data-testid="atomic-heatmap"]'));
      assert.equal(gymGolf.length, 2);
      const readingOnGymGolf = await driver.findElements(
        By.css('[data-testid="atomic-heatmap"][data-activity="reading"]'),
      );
      assert.equal(readingOnGymGolf.length, 0);
    });
  });

  it("shows property dropdowns on reading, golf, and gym notes", async () => {
    await check(driver, "property-dropdowns", async () => {
      await openVaultFile(driver, E2E_FILES.readingCurrent);
      const status = await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="status"]',
      );
      assert.equal(await status.getAttribute("value"), "reading");

      await openVaultFile(driver, E2E_FILES.golfSession(today.slice(0, 4), today));
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="felt"]',
      );
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="location"]',
      );

      await openVaultFile(driver, E2E_FILES.gymSession(today.slice(0, 4), today));
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="location"]',
      );
      await waitCss(
        driver,
        'select[data-testid="atomic-property-select"][data-property="weight_unit"]',
      );
    });
  });

  it("filters the book shelf by reading status", async () => {
    await check(driver, "bookshelf-status", async () => {
      await openVaultFile(driver, E2E_FILES.bookshelfAll);
      await waitCss(driver, '[data-testid="atomic-book"][data-title="Currently Reading"]');
      await waitCss(driver, '[data-testid="atomic-book"][data-title="Finished Book"]');
      const all = await driver.findElements(By.css('[data-testid="atomic-book"]'));
      assert.equal(all.length, 2);

      await openVaultFile(driver, E2E_FILES.bookshelfReading);
      await waitCss(driver, '[data-testid="atomic-book"][data-status="reading"]');
      const filtered = await driver.findElements(By.css('[data-testid="atomic-book"]'));
      assert.equal(filtered.length, 1);
      assert.equal(await filtered[0].getAttribute("data-title"), "Currently Reading");
    });
  });

  it("creates a reading item and start/stops its timer", async () => {
    await check(driver, "reading-timer", async () => {
      const ran = await runCommand(driver, "atomic-tracker:new-reading-item");
      assert.equal(ran, true);
      await fillPrompt(driver, "E2E Timer Book");
      await waitCss(driver, '[data-testid="atomic-timer-start"]');

      await driver.findElement(By.css('[data-testid="atomic-timer-start"]')).click();
      await waitCss(driver, '[data-testid="atomic-timer-stop"]');

      await driver.executeAsyncScript(`
        const done = arguments[0];
        const file = app.workspace.getActiveFile();
        const started = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        app.fileManager.processFrontMatter(file, (fm) => {
          fm.timer_started_at = started;
        }).then(() => done(true), (err) => done(String(err)));
      `);
      await waitCss(driver, '[data-testid="atomic-timer-stop"]');
      await driver.findElement(By.css('[data-testid="atomic-timer-stop"]')).click();
      await fillPrompt(driver, "selenium session");
      await waitForNotice(driver, "Logged");

      await openVaultFile(driver, E2E_FILES.heatmapReading);
      const todayCell = await waitCss(
        driver,
        '[data-testid="atomic-heatmap"][data-activity="reading"] [data-testid="atomic-heatmap-today"]',
      );
      const minutes = Number(await todayCell.getAttribute("data-minutes"));
      assert.ok(minutes >= 25, `expected reading minutes >= 25, got ${minutes}`);
    });
  });

  it("shows settings color picker, swatches, add, enable/disable, and delete", async () => {
    await check(driver, "settings", async () => {
      await openAtomicSettings(driver);

      for (const id of ["gym", "golf", "reading"]) {
        const row = await waitCss(
          driver,
          `[data-testid="atomic-setting-activity"][data-activity-id="${id}"]`,
        );
        assert.ok(row);
        const colors = await waitCss(
          driver,
          `[data-testid="atomic-setting-colors"][data-activity-id="${id}"]`,
        );
        const picker = await colors.findElement(By.css('input[type="color"]'));
        assert.ok(await picker.isDisplayed());
        const swatches = await colors.findElements(
          By.css('[data-testid="atomic-color-swatch"]'),
        );
        assert.equal(swatches.length, 4);
      }

      const add = await waitCss(driver, '[data-testid="atomic-setting-add-hobby"]');
      const nameInput = await add.findElement(By.css("input"));
      await nameInput.clear();
      await nameInput.sendKeys("Chess");
      const addBtn = await add.findElement(By.css("button"));
      await addBtn.click();
      await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="chess"]',
      );

      const readingRow = await driver.findElement(
        By.css('[data-testid="atomic-setting-activity"][data-activity-id="reading"]'),
      );
      const enabledToggle = await readingRow.findElement(By.css(".checkbox-container"));
      await enabledToggle.click();
      await closeSettings(driver);

      await openVaultFile(driver, E2E_FILES.heatmapReading);
      await waitCss(driver, '[data-testid="atomic-heatmap-invalid"]');

      await openAtomicSettings(driver);
      const readingOff = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="reading"]',
      );
      await readingOff.findElement(By.css(".checkbox-container")).click();

      const chessRow = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="chess"]',
      );
      const deleteBtn = await chessRow.findElement(By.css("button.mod-warning"));
      await deleteBtn.click();
      const confirm = await waitCss(driver, '[data-testid="atomic-confirm-delete-modal"]');
      await confirm.findElement(By.css("button.mod-warning")).click();

      await driver.wait(async () => {
        const leftover = await driver.findElements(
          By.css('[data-testid="atomic-setting-activity"][data-activity-id="chess"]'),
        );
        return leftover.length === 0;
      }, 8000);

      await closeSettings(driver);
    });
  });

  it("opens reading Bases and shows a Notice when Reading is disabled", async () => {
    await check(driver, "reading-bases", async () => {
      const opened = await runCommand(driver, "atomic-tracker:open-reading-bookshelf");
      assert.equal(opened, true);
      await driver.wait(async () => {
        const path = await driver.executeScript(
          `return app.workspace.getActiveFile()?.path || ""`,
        );
        return path.includes("Bookshelf.base");
      }, 10000);

      await openAtomicSettings(driver);
      const readingRow = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="reading"]',
      );
      await readingRow.findElement(By.css(".checkbox-container")).click();
      await closeSettings(driver);

      await runCommand(driver, "atomic-tracker:open-reading-bookshelf");
      await waitForNotice(driver, "No Reading hobby configured");

      await openAtomicSettings(driver);
      const readingOn = await waitCss(
        driver,
        '[data-testid="atomic-setting-activity"][data-activity-id="reading"]',
      );
      await readingOn.findElement(By.css(".checkbox-container")).click();
      await closeSettings(driver);

      await driver.executeScript(`
        const bases = app.internalPlugins?.getPluginById?.("bases");
        if (bases && bases.disable) bases.disable();
        else if (app.internalPlugins?.plugins?.bases) {
          app.internalPlugins.plugins.bases.enabled = false;
        }
      `);
      await runCommand(driver, "atomic-tracker:open-reading-bookshelf");
      await waitForNotice(driver, "Enable the Bases core plugin");
    });
  });
});

if (skipReason) {
  console.log(`Skipping Selenium E2E: ${skipReason}`);
} else {
  console.log(`Selenium artifacts directory: ${ARTIFACT_DIR}`);
}
