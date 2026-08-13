import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readPluginSourceGlobs() {
  return readFileSync(join(root, ".github/plugin-source-paths.txt"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
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

function yamlKeyBlock(yaml, indent, key) {
  const needle = `\n${indent}${key}:\n`;
  const start = yaml.indexOf(needle);
  assert.notEqual(start, -1, `missing ${key} block`);
  const rest = yaml.slice(start + needle.length);
  const end = rest.search(new RegExp(`\\n${indent}\\S`));
  return end === -1 ? rest : rest.slice(0, end);
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
  assert.deepEqual(quotedPathLines(yamlKeyBlock(release, "    ", "paths")), expected);
});

test("ci.yml change detection uses the plugin source path list", () => {
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /plugin-source-paths\.txt/);
  assert.match(ci, /git diff --name-only/);
  assert.match(ci, /^\s+tests\s*\\$/m);
  assert.match(ci, /\.github\/workflows\/release\.yml/);
  assert.match(ci, /needs\.changes\.outputs\.source == 'true'/);
  assert.doesNotMatch(ci, /\|\| true/);
});

test("ci.yml keeps the required Test and build check on every PR", () => {
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.doesNotMatch(yamlKeyBlock(ci, "", "on"), /paths:/);
  assert.match(ci, /^    name: Test and build$/m);
  assert.match(ci, /^\s+if: always\(\)$/m);
});

test("release.yml does not publish for docs, examples, or tests", () => {
  const release = readFileSync(
    join(root, ".github/workflows/release.yml"),
    "utf8",
  );
  const paths = quotedPathLines(yamlKeyBlock(release, "    ", "paths"));
  assert.ok(!paths.some((p) => p.startsWith("docs") || p.includes(".md")));
  assert.ok(!paths.includes("tests/**"));
  assert.ok(!paths.includes("examples/**"));
});

test("codeql.yml pull requests stay unfiltered", () => {
  const codeql = readFileSync(
    join(root, ".github/workflows/codeql.yml"),
    "utf8",
  );
  assert.doesNotMatch(yamlKeyBlock(codeql, "  ", "pull_request"), /paths:/);
});
