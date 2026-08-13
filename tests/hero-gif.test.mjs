import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function gifSize(buffer) {
  assert.equal(buffer.slice(0, 6).toString("ascii"), "GIF89a");
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

test("README embeds the animated hero GIF", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(readme, /docs\/images\/atomic-daily-hero\.gif/);
  assert.doesNotMatch(readme, /docs\/images\/atomic-daily-hero\.png/);
});

test("hero GIF is 1600x900 and a small looping animation", () => {
  const path = join(root, "docs/images/atomic-daily-hero.gif");
  assert.equal(existsSync(path), true);
  const gif = readFileSync(path);
  const { width, height } = gifSize(gif);
  assert.equal(width, 1600);
  assert.equal(height, 900);
  assert.ok(gif.length > 50_000, `gif too small: ${gif.length}`);
  assert.ok(gif.length < 5_000_000, `gif too large: ${gif.length}`);
});

test("capture-readme-hero.sh writes the GIF after composing the still", () => {
  const script = readFileSync(join(root, "scripts/capture-readme-hero.sh"), "utf8");
  assert.match(script, /animate-hero-gif\.py/);
  assert.match(script, /atomic-daily-hero\.gif/);
});

test("animate-hero-gif locates the rightmost desktop book left of the phone", (t) => {
  try {
    execFileSync("python3", ["-c", "from PIL import Image"], { stdio: "ignore" });
  } catch {
    t.skip("Pillow is not installed");
    return;
  }
  const out = execFileSync(
    "python3",
    [
      join(root, "scripts/animate-hero-gif.py"),
      "--hero",
      join(root, "docs/images/atomic-daily-hero.png"),
      "--dump-book",
    ],
    { encoding: "utf8" },
  );
  const match = out.match(/x0=(\d+) y0=(\d+) x1=(\d+) y1=(\d+) w=(\d+) h=(\d+)/);
  assert.ok(match, out);
  const x0 = Number(match[1]);
  const x1 = Number(match[3]);
  const height = Number(match[6]);
  assert.ok(x0 > 700, `rightmost book too far left: ${x0}`);
  assert.ok(x1 < 1220, `rightmost book under the phone: ${x1}`);
  assert.ok(height >= 70, `rightmost book too short: ${height}`);
});
