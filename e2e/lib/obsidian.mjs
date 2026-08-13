/**
 * Launch Obsidian with Chrome DevTools and attach Selenium.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import {
  E2E_VAULT_ID,
  registerVaultInObsidianConfig,
} from "./vault.mjs";

export const DEBUG_PORT = Number(process.env.ATOMIC_E2E_DEBUG_PORT || 9222);
export const ARTIFACT_DIR =
  process.env.ATOMIC_E2E_ARTIFACTS || "/tmp/atomic-e2e-artifacts";

export function findObsidianBinary() {
  const candidates = [
    process.env.OBSIDIAN,
    "/opt/Obsidian/obsidian",
    "/usr/bin/obsidian",
  ].filter(Boolean);
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

export function e2eSkipReason() {
  if (process.env.SKIP_E2E === "1") return "SKIP_E2E=1";
  if (!findObsidianBinary()) return "Obsidian is not installed";
  if (!process.env.DISPLAY) return "DISPLAY is not set";
  return "";
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

export async function waitForCdp(port = DEBUG_PORT, timeoutMs = 90000) {
  const start = Date.now();
  let lastError = "";
  while (Date.now() - start < timeoutMs) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await sleep(250);
    }
  }
  throw new Error(`Obsidian CDP not ready on port ${port}: ${lastError}`);
}

function killObsidian() {
  spawnSync("pkill", ["-9", "-f", "/opt/Obsidian/obsidian"], { stdio: "ignore" });
  spawnSync("pkill", ["-9", "-f", "/usr/bin/obsidian"], { stdio: "ignore" });
}

export async function launchObsidian(vaultPath, filePath) {
  const binary = findObsidianBinary();
  if (!binary) throw new Error("Obsidian binary not found");

  killObsidian();
  await sleep(1000);

  const vaultId = registerVaultInObsidianConfig(vaultPath, E2E_VAULT_ID);
  const encoded = encodeURIComponent(filePath);
  const uri = `obsidian://open?vault=${vaultId}&file=${encoded}`;
  const logFile = "/tmp/atomic-e2e-obsidian.log";
  const child = spawn(
    binary,
    [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--remote-allow-origins=*",
      uri,
    ],
    {
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ":1" },
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  child.unref();

  const version = await waitForCdp(DEBUG_PORT);
  return { child, version, logFile, vaultId };
}

export async function attachSelenium(port = DEBUG_PORT) {
  const options = new chrome.Options();
  options.addArguments("--remote-allow-origins=*");
  options.debuggerAddress(`127.0.0.1:${port}`);
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  return driver;
}

export async function switchToObsidianWindow(driver, timeoutMs = 60000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    const handles = await driver.getAllWindowHandles();
    for (const handle of handles) {
      await driver.switchTo().window(handle);
      try {
        const ready = await driver.executeScript(
          `return !!(window.app && app.workspace)`,
        );
        if (ready) return handle;
        last = await driver.getTitle();
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
      }
    }
    await dismissTrustDialog(driver);
    await sleep(500);
  }
  throw new Error(`Obsidian workspace window not found (${last})`);
}

export async function dismissTrustDialog(driver) {
  try {
    return await driver.executeScript(`
      const nodes = Array.from(document.querySelectorAll("button, .mod-cta"));
      const trust = nodes.find((el) => /trust/i.test(el.textContent || ""));
      if (trust) {
        trust.click();
        return true;
      }
      return false;
    `);
  } catch {
    return false;
  }
}

export async function waitForPlugin(driver, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await dismissTrustDialog(driver);
    try {
      const loaded = await driver.executeScript(
        `return !!(window.app && app.plugins && app.plugins.plugins["atomic-tracker"])`,
      );
      if (loaded) return;
    } catch {
      // window not ready
    }
    await sleep(400);
  }
  throw new Error("Atomic Tracker plugin did not load");
}

export async function saveScreenshot(driver, name) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const png = await driver.takeScreenshot();
  const path = join(ARTIFACT_DIR, `${name}.png`);
  writeFileSync(path, png, "base64");
  return path;
}

export async function waitCss(driver, css, timeoutMs = 15000) {
  return driver.wait(until.elementLocated(By.css(css)), timeoutMs);
}

export async function openVaultFile(driver, path) {
  const result = await driver.executeAsyncScript(
    `
    const path = arguments[0];
    const done = arguments[1];
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) {
      done({ ok: false, error: "missing " + path });
      return;
    }
    app.workspace.getLeaf(false).openFile(file).then(
      () => done({ ok: true }),
      (err) => done({ ok: false, error: String(err) }),
    );
    `,
    path,
  );
  if (!result?.ok) throw new Error(`openVaultFile ${path}: ${result?.error}`);
}

export async function runCommand(driver, id) {
  const result = await driver.executeScript(
    `return app.commands.executeCommandById(arguments[0])`,
    id,
  );
  return result;
}

export async function openAtomicSettings(driver) {
  await driver.executeScript(`
    app.setting.open();
    app.setting.openTabById("atomic-tracker");
  `);
  await waitCss(driver, '[data-testid="atomic-setting-activity"]');
}

export async function closeSettings(driver) {
  await driver.executeScript(`
    if (app.setting && app.setting.close) app.setting.close();
  `);
  await sleep(200);
}

export async function noticeTexts(driver) {
  const notices = await driver.findElements(By.css(".notice"));
  const texts = [];
  for (const notice of notices) {
    texts.push(await notice.getText());
  }
  return texts;
}

export async function waitForNotice(driver, needle, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const texts = await noticeTexts(driver);
    const hit = texts.find((text) => text.includes(needle));
    if (hit) return hit;
    await sleep(200);
  }
  throw new Error(`Notice containing ${JSON.stringify(needle)} not found`);
}

export async function fillPrompt(driver, value) {
  const modal = await waitCss(driver, '[data-testid="atomic-prompt-modal"]');
  const input = await modal.findElement(By.css("input"));
  await input.clear();
  await input.sendKeys(value);
  const ok = await modal.findElement(By.css("button.mod-cta"));
  await ok.click();
}

export async function stopSession(session) {
  try {
    await session?.driver?.quit();
  } catch {
    // already gone
  }
  killObsidian();
  await sleep(500);
}

