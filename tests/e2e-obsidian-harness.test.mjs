import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { e2eSkipReason, resolveDisplay } from "../e2e/lib/obsidian.mjs";

function withEnv(key, value, fn) {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}

test("resolveDisplay prefers DISPLAY when set", () => {
  withEnv("DISPLAY", ":99", () => {
    assert.equal(resolveDisplay(), ":99");
  });
});

test("e2eSkipReason honors SKIP_E2E even when a display is available", () => {
  withEnv("SKIP_E2E", "1", () => {
    withEnv("DISPLAY", ":1", () => {
      assert.equal(e2eSkipReason(), "SKIP_E2E=1");
    });
  });
});

test("noticeTexts reads notices in one script to avoid stale elements", () => {
  const src = readFileSync(new URL("../e2e/lib/obsidian.mjs", import.meta.url), "utf8");
  assert.match(src, /export async function noticeTexts/);
  assert.match(src, /querySelectorAll\("\.notice"\)/);
  assert.doesNotMatch(
    src,
    /export async function noticeTexts[\s\S]*findElements\(By\.css\("\.notice"\)\)/,
  );
});
