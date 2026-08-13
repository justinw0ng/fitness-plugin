/**
 * Recapture USER_GUIDE screenshots with original demo covers (no publisher art).
 *
 * Run: node scripts/capture-user-guide-screenshots.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Key } from "selenium-webdriver";
import { E2E_VAULT_ID, registerVaultInObsidianConfig } from "../e2e/lib/vault.mjs";
import {
  attachSelenium,
  closeSettings,
  DEBUG_PORT,
  DEFAULT_DISPLAY,
  e2eSkipReason,
  findObsidianBinary,
  openAtomicSettings,
  openVaultFile,
  resolveDisplay,
  saveScreenshot,
  sleep,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForCdp,
  waitForPlugin,
} from "../e2e/lib/obsidian.mjs";
import {
  OPEN_COVER_TITLE,
  prepareUserGuideVault,
  TIMER_ITEM_TITLE,
  USER_GUIDE_VAULT,
} from "./prepare-user-guide-vault.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = join(ROOT, "docs/images");

const FILES = {
  bookShelf: "atomics/hobbies/Reading/Book Shelf.md",
  timerItem: `atomics/hobbies/Reading/Items/${TIMER_ITEM_TITLE}.md`,
};

const OUTPUTS = {
  bookShelf: "atomic-book-shelf.png",
  bookShelfOpen: "atomic-book-shelf-open.png",
  timer: "atomic-reading-timer.png",
  settings: "07-settings-atomic.png",
  enable: "06-enable-atomic-plugin.png",
};

async function collapseSidebars(driver) {
  await driver.executeScript(`
    app.workspace.leftSplit?.collapse?.();
    app.workspace.rightSplit?.collapse?.();
  `);
}

async function showPreview(driver) {
  await driver.executeAsyncScript(`
    const done = arguments[0];
    const leaf = app.workspace.getMostRecentLeaf();
    if (!leaf) {
      done(false);
      return;
    }
    const state = leaf.getViewState();
    state.state = state.state || {};
    state.state.mode = "preview";
    state.state.source = false;
    leaf.setViewState(state).then(() => done(true), () => done(false));
  `);
}

async function launchForCapture(vaultPath, filePath) {
  spawnSync("pkill", ["-9", "-f", "/opt/Obsidian/obsidian"], { stdio: "ignore" });
  spawnSync("pkill", ["-9", "-f", "/usr/bin/obsidian"], { stdio: "ignore" });
  await sleep(1000);
  const binary = findObsidianBinary();
  if (!binary) throw new Error("Obsidian binary not found");
  const vaultId = registerVaultInObsidianConfig(vaultPath, E2E_VAULT_ID);
  const uri = `obsidian://open?vault=${vaultId}&file=${encodeURIComponent(filePath)}`;
  const child = spawn(
    binary,
    [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--remote-allow-origins=*",
      uri,
    ],
    {
      env: { ...process.env, DISPLAY: resolveDisplay() || DEFAULT_DISPLAY },
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
  const version = await waitForCdp(DEBUG_PORT);
  return { child, version, vaultId };
}

function spawnXdotool(args) {
  const result = spawnSync("xdotool", args, { encoding: "utf8" });
  if (result.error?.code === "ENOENT") {
    return { missing: true, result };
  }
  return { missing: false, result };
}

function xdotoolResize(width, height) {
  const search = spawnXdotool(["search", "--name", "Obsidian"]);
  if (search.missing) return { missing: true };
  const ids = (search.result.stdout || "").trim().split("\n").filter(Boolean);
  for (const id of ids) {
    spawnXdotool(["windowmove", "--sync", id, "0", "0"]);
    spawnXdotool(["windowsize", "--sync", id, String(width), String(height)]);
    spawnXdotool(["windowactivate", "--sync", id]);
  }
  return { missing: false };
}

async function resizeWindow(driver, width, height) {
  let setRectOk = false;
  try {
    await driver.manage().window().setRect({ x: 0, y: 0, width, height });
    setRectOk = true;
  } catch {
    // Electron sometimes rejects setRect; xdotool is the fallback.
  }
  const xdo = xdotoolResize(width, height);
  if (xdo.missing && !setRectOk) {
    throw new Error(
      "Could not resize the Obsidian window. Electron rejected setRect and xdotool is not installed. Install xdotool (apt install xdotool) or allow window.setRect.",
    );
  }
  await sleep(400);
}

async function waitForCoverImages(driver, min = 12, timeoutMs = 30000) {
  const start = Date.now();
  let last = 0;
  while (Date.now() - start < timeoutMs) {
    last = await driver.executeScript(`
      return [...document.querySelectorAll(".atomic-book-cover-image")]
        .filter((img) => img.complete && img.naturalWidth > 40).length;
    `);
    if (last >= min) return last;
    await sleep(400);
  }
  throw new Error(`Cover images not ready (loaded ${last}, need ${min})`);
}

async function parkMouse(driver) {
  try {
    await driver.actions({ async: false }).sendKeys(Key.ESCAPE).perform();
    await driver.actions({ async: false }).move({ x: 12, y: 12, origin: "viewport" }).perform();
  } catch {
    // Mouse parking is best-effort.
  }
}

async function openCover(driver, title) {
  const result = await driver.executeScript(
    `
    const title = arguments[0];
    const books = [...document.querySelectorAll('[data-testid="atomic-book"][data-title="' + title + '"]')];
    const visible = books.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20;
    });
    const book = visible || books[0];
    if (!book) return { ok: false, error: "missing book", count: books.length };
    const rect = book.getBoundingClientRect();
    book.scrollIntoView({ block: "center", inline: "nearest" });
    book.classList.add("is-cover-open");
    book.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    const cover = book.querySelector(".atomic-book-cover");
    const volume = book.querySelector(".atomic-book-volume");
    for (const el of [book, cover, volume]) {
      if (!el) continue;
      el.style.setProperty("transition", "none", "important");
    }
    if (cover) {
      // This VM flattens CSS 3D (rotateY → identity). Hide the face so the
      // page (title + author) shows, matching the documented cover-open hover.
      cover.style.setProperty("opacity", "0", "important");
    }
    book.style.setProperty("position", "relative", "important");
    book.style.setProperty("top", "-8px", "important");
    book.style.setProperty("z-index", "6", "important");
    return {
      ok: true,
      count: books.length,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      opacity: cover ? getComputedStyle(cover).opacity : "",
      title: book.getAttribute("data-title"),
    };
    `,
    title,
  );
  if (!result?.ok) {
    throw new Error(`Could not open cover for ${title}: ${JSON.stringify(result)}`);
  }
  await sleep(300);
  const again = await driver.executeScript(
    `
    const title = arguments[0];
    const books = [...document.querySelectorAll('[data-testid="atomic-book"][data-title="' + title + '"]')];
    const book = books.find((el) => el.getBoundingClientRect().width > 20);
    if (!book) return { ok: false };
    book.classList.add("is-cover-open");
    book.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    const cover = book.querySelector(".atomic-book-cover");
    if (cover) {
      cover.style.setProperty("transition", "none", "important");
      cover.style.setProperty("opacity", "0", "important");
    }
    book.style.setProperty("position", "relative", "important");
    book.style.setProperty("top", "-8px", "important");
    book.style.setProperty("z-index", "6", "important");
    return { ok: true, opacity: cover ? getComputedStyle(cover).opacity : "" };
    `,
    title,
  );
  if (!again?.ok || again.opacity !== "0") {
    throw new Error(`Cover did not stay open: ${JSON.stringify(again)}`);
  }
  return result;
}

async function openNote(driver, path) {
  await openVaultFile(driver, path);
  await collapseSidebars(driver);
  await showPreview(driver);
  await sleep(600);
}

async function captureTo(driver, name, destName) {
  const src = await saveScreenshot(driver, name);
  const dest = join(IMAGES, destName);
  copyFileSync(src, dest);
  if (!existsSync(dest)) throw new Error(`Failed to write ${dest}`);
  console.log(`Wrote ${dest}`);
  return dest;
}

async function openCommunityPlugins(driver) {
  await driver.executeScript(`
    if (app.setting.shouldUsePopout) {
      app.setting.shouldUsePopout = () => false;
    }
    app.setting.open();
    app.setting.openTabById("community-plugins");
  `);
  await waitCss(driver, ".vertical-tab-nav-item", 8000);
  const opened = await driver.executeScript(`
    const items = Array.from(document.querySelectorAll(".vertical-tab-nav-item"));
    const tab = items.find((el) => /community plugins/i.test(el.textContent || ""));
    if (tab) tab.click();
    if (app.setting && app.setting.openTabById) {
      app.setting.openTabById("community-plugins");
    }
    return /community plugins/i.test(document.body.innerText || "");
  `);
  if (!opened) throw new Error("Could not open Community plugins settings");
  await sleep(500);
}

async function main() {
  const skip = e2eSkipReason();
  if (skip) {
    throw new Error(`Cannot capture screenshots: ${skip}`);
  }

  prepareUserGuideVault();
  const launched = await launchForCapture(USER_GUIDE_VAULT, FILES.bookShelf);
  const driver = await attachSelenium(undefined, launched.version);
  try {
    await switchToObsidianWindow(driver);
    await waitForPlugin(driver);
    await resizeWindow(driver, 1920, 1200);

    await openNote(driver, FILES.bookShelf);
    await waitCss(driver, '[data-testid="atomic-bookshelf"]');
    await waitForCoverImages(driver, 12);
    await parkMouse(driver);
    await sleep(900);
    await captureTo(driver, "user-guide-book-shelf", OUTPUTS.bookShelf);

    await openCover(driver, OPEN_COVER_TITLE);
    await captureTo(driver, "user-guide-book-shelf-open", OUTPUTS.bookShelfOpen);
    await parkMouse(driver);

    await openNote(driver, FILES.timerItem);
    await waitCss(driver, '[data-testid="atomic-timer"]');
    await waitCss(driver, '[data-testid="atomic-timer-stop"]');
    await parkMouse(driver);
    await sleep(500);
    await captureTo(driver, "user-guide-reading-timer", OUTPUTS.timer);

    await openNote(driver, FILES.bookShelf);
    await waitCss(driver, '[data-testid="atomic-bookshelf"]');
    await waitForCoverImages(driver, 12);
    await openAtomicSettings(driver);
    await waitCss(driver, '[data-testid="atomic-setting-activity"]');
    await driver.executeScript(`
      const heading = Array.from(document.querySelectorAll(".setting-item-heading, .setting-item-name"))
        .find((el) => /exercise types/i.test(el.textContent || ""));
      heading?.scrollIntoView({ block: "start" });
    `);
    await sleep(400);
    await captureTo(driver, "user-guide-settings", OUTPUTS.settings);
    await closeSettings(driver);

    await resizeWindow(driver, 1280, 800);
    await openNote(driver, FILES.timerItem);
    await waitCss(driver, '[data-testid="atomic-timer"]');
    await openCommunityPlugins(driver);
    await sleep(600);
    await captureTo(driver, "user-guide-enable-plugin", OUTPUTS.enable);
  } finally {
    await stopSession({ driver });
  }
}

await main();
