import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readPluginSourceGlobs() {
  return readFileSync(join(root, ".github/plugin-source-paths.txt"), "utf8")
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);
}

function quotedPathLines(yaml) {
  return yaml
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s+-\s+"([^"]+)"\s*$/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
}

function releasePushPaths(yaml) {
  const start = yaml.indexOf("\n    paths:\n");
  assert.notEqual(start, -1, "release.yml push trigger is missing paths");
  const rest = yaml.slice(start + "\n    paths:\n".length);
  const end = rest.search(/\n  \S/);
  const block = end === -1 ? rest : rest.slice(0, end);
  return quotedPathLines(block);
}

test("plugin source path list is non-empty and has no duplicates", () => {
  const globs = readPluginSourceGlobs();
  assert.ok(globs.length > 0);
  assert.deepEqual(globs, [...new Set(globs)]);
});

test("release.yml on.paths matches the plugin source path list", () => {
  const expected = readPluginSourceGlobs();
  const release = readFileSync(
    join(root, ".github/workflows/release.yml"),
    "utf8",
  );
  assert.deepEqual(releasePushPaths(release), expected);
});

test("ci.yml change detection uses the plugin source path list", () => {
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /plugin-source-paths\.txt/);
  assert.match(ci, /git diff --name-only/);
  assert.match(ci, /^\s+tests\s*\\$/m);
  assert.match(ci, /needs\.changes\.outputs\.source == 'true'/);
});

test("release.yml does not publish for docs, examples, or tests", () => {
  const release = readFileSync(
    join(root, ".github/workflows/release.yml"),
    "utf8",
  );
  const paths = releasePushPaths(release);
  assert.ok(!paths.some((p) => p.startsWith("docs") || p.includes(".md")));
  assert.ok(!paths.includes("tests/**"));
  assert.ok(!paths.includes("examples/**"));
});
