/**
 * Launch Obsidian with Chrome DevTools and attach Selenium.
 */
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Builder, By, Key, until } from "selenium-webdriver";
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

export async function sleep(ms) {
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

function chromeVersionFromCdp(versionInfo) {
  const raw = String(versionInfo?.Browser || versionInfo?.browser || "");
  const match = raw.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (!match) {
    throw new Error(`Could not parse Chrome version from ${JSON.stringify(versionInfo)}`);
  }
  return match[1];
}

export async function ensureChromeDriver(chromeVersion) {
  const cacheDir = join(
    process.env.ATOMIC_E2E_DRIVER_DIR || "/tmp/atomic-e2e-drivers",
    chromeVersion,
  );
  const binary = join(cacheDir, "chromedriver");
  if (existsSync(binary)) return binary;

  mkdirSync(cacheDir, { recursive: true });
  const zipUrl = `https://storage.googleapis.com/chrome-for-testing-public/${chromeVersion}/linux64/chromedriver-linux64.zip`;
  const zipPath = join(cacheDir, "chromedriver.zip");
  const res = await fetch(zipUrl);
  if (!res.ok) {
    throw new Error(`Failed to download ChromeDriver ${chromeVersion}: ${res.status} ${zipUrl}`);
  }
  writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
  const unzip = spawnSync(
    "python3",
    ["-c", "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])", zipPath, cacheDir],
    { encoding: "utf8" },
  );
  if (unzip.status !== 0) {
    throw new Error(`Failed to unzip ChromeDriver: ${unzip.stderr || unzip.stdout}`);
  }
  const nested = join(cacheDir, "chromedriver-linux64", "chromedriver");
  const resolved = existsSync(nested) ? nested : binary;
  if (!existsSync(resolved)) {
    throw new Error(`ChromeDriver binary missing after unzip in ${cacheDir}`);
  }
  chmodSync(resolved, 0o755);
  if (resolved !== binary) {
    spawnSync("cp", [resolved, binary]);
    chmodSync(binary, 0o755);
  }
  return binary;
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

export async function attachSelenium(port = DEBUG_PORT, versionInfo) {
  const chromeVersion = chromeVersionFromCdp(versionInfo || (await waitForCdp(port)));
  const driverPath = await ensureChromeDriver(chromeVersion);
  const options = new chrome.Options();
  options.addArguments("--remote-allow-origins=*");
  options.debuggerAddress(`127.0.0.1:${port}`);
  const service = new chrome.ServiceBuilder(driverPath);
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .setChromeService(service)
    .build();
  return driver;
}

export async function switchToObsidianWindow(driver, timeoutMs = 60000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    const handles = await driver.getAllWindowHandles();
    let fallback = null;
    for (const handle of handles) {
      await driver.switchTo().window(handle);
      try {
        const state = await driver.executeScript(`
          return {
            workspace: !!(window.app && app.workspace),
            markdown: !!document.querySelector('.workspace-leaf-content[data-type="markdown"]'),
            settings: !!document.querySelector('.vertical-tab-nav-item'),
          };
        `);
        if (state.workspace && state.markdown) return handle;
        if (state.workspace && !state.settings) fallback = handle;
        last = await driver.getTitle();
      } catch (error) {
        last = error instanceof Error ? error.message : String(error);
      }
    }
    if (fallback) {
      await driver.switchTo().window(fallback);
      return fallback;
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
        `return !!(window.app && app.plugins && app.plugins.plugins["atomic-tracker"] && app.workspace.getMostRecentLeaf && app.workspace.getMostRecentLeaf())`,
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
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await driver.executeAsyncScript(
      `
      const path = arguments[0];
      const done = arguments[1];
      const file = app.vault.getAbstractFileByPath(path);
      if (!file) {
        done({ ok: false, error: "missing " + path });
        return;
      }
      const open = async () => {
        if (typeof app.workspace.openLinkText === "function") {
          await app.workspace.openLinkText(path, "", false);
          return;
        }
        const leaf =
          app.workspace.getMostRecentLeaf?.() ||
          app.workspace.getLeaf?.(true);
        if (!leaf) throw new Error("no workspace leaf");
        await leaf.openFile(file);
      };
      open().then(
        () => done({ ok: true }),
        (err) => done({ ok: false, error: String(err) }),
      );
      `,
      path,
    );
    if (result?.ok) return;
    lastError = result?.error || "unknown";
    await sleep(300);
  }
  throw new Error(`openVaultFile ${path}: ${lastError}`);
}

export async function runCommand(driver, id) {
  const result = await driver.executeScript(
    `return app.commands.executeCommandById(arguments[0])`,
    id,
  );
  return result;
}

export async function openCommandPalette(driver) {
  await driver.actions({ async: false }).keyDown(Key.CONTROL).sendKeys("p").keyUp(Key.CONTROL).perform();
  await waitCss(driver, ".prompt-input", 8000);
}

export async function runCommandViaPalette(driver, query) {
  await switchToObsidianWindow(driver, 8000);
  await driver.actions({ async: false }).sendKeys(Key.ESCAPE).perform();
  await sleep(150);
  await openCommandPalette(driver);
  const input = await driver.findElement(By.css(".prompt-input"));
  await input.clear();
  await input.sendKeys(query);
  await sleep(400);
  await input.sendKeys(Key.ENTER);
}

export async function openAtomicSettings(driver) {
  await driver.actions({ async: false }).sendKeys(Key.ESCAPE).perform();
  await sleep(150);
  await driver.executeScript(`
    if (app.setting.shouldUsePopout) {
      app.setting.shouldUsePopout = () => false;
    }
    app.setting.open();
    app.setting.openTabById("atomic-tracker");
  `);
  const found = await switchToWindowMatching(driver, () =>
    driver.executeScript(
      `return !!document.querySelector('[data-testid="atomic-setting-activity"], .vertical-tab-nav-item')`,
    ),
  );
  if (!found) throw new Error("Could not open Atomic Tracker settings");
  const opened = await driver.executeScript(`
    const items = Array.from(document.querySelectorAll(".vertical-tab-nav-item"));
    const tab = items.find((el) => /atomic tracker/i.test(el.textContent || ""));
    if (tab) tab.click();
    if (app.setting && app.setting.openTabById) {
      app.setting.openTabById("atomic-tracker");
    }
    return !!document.querySelector('[data-testid="atomic-setting-activity"]');
  `);
  if (!opened) {
    await waitCss(driver, '[data-testid="atomic-setting-activity"]', 8000);
  }
}

async function switchToWindowMatching(driver, predicate, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const handles = await driver.getAllWindowHandles();
    for (const handle of handles) {
      await driver.switchTo().window(handle);
      try {
        if (await predicate()) return handle;
      } catch {
        // window not ready
      }
    }
    await sleep(200);
  }
  return null;
}

export async function closeSettings(driver) {
  await driver.executeScript(`
    if (app.setting && app.setting.close) app.setting.close();
  `);
  await sleep(200);
  await switchToObsidianWindow(driver, 8000);
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

export async function queryBooks(driver) {
  return driver.executeScript(`
    return Array.from(document.querySelectorAll('[data-testid="atomic-book"]')).map((el) => ({
      title: el.getAttribute("data-title"),
      status: el.getAttribute("data-status"),
    }));
  `);
}

export async function fillPrompt(driver, value) {
  const modal = await waitCss(driver, '[data-testid="atomic-prompt-modal"], .modal');
  const input = await modal.findElement(By.css("input"));
  await input.click();
  await input.clear();
  await input.sendKeys(value);
  const okButtons = await modal.findElements(By.css("button.mod-cta"));
  if (okButtons.length) {
    await okButtons[0].click();
    return;
  }
  await input.sendKeys(Key.ENTER);
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

