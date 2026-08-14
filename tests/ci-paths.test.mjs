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

test("ci.yml change detection uses the plugin source path list", () => {
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /plugin-source-paths\.txt/);
  assert.match(ci, /git diff --name-only/);
  assert.match(ci, /^\s+tests\s*\\$/m);
  assert.match(ci, /^\s+e2e\s*\\$/m);
  assert.match(ci, /\.github\/workflows\/release\.yml/);
  assert.doesNotMatch(ci, /\|\| true/);
});

test("ci.yml does not bump versions or push commits", () => {
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.doesNotMatch(ci, /node scripts\/ensure-pr-version/);
  assert.doesNotMatch(ci, /node scripts\/check-version-conflict/);
  assert.doesNotMatch(ci, /git commit/);
  assert.doesNotMatch(ci, /git push/);
  assert.doesNotMatch(ci, /contents:\s*write/);
  assert.doesNotMatch(ci, /version bump/);
});

test("ci.yml keeps the required Test and build check on every PR", () => {
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.doesNotMatch(yamlKeyBlock(ci, "", "on"), /paths:/);
  assert.match(ci, /^    name: Test and build$/m);
  assert.match(ci, /^\s+if: always\(\)$/m);
});

test("release.yml is manual workflow_dispatch only", () => {
  const release = readFileSync(
    join(root, ".github/workflows/release.yml"),
    "utf8",
  );
  const onBlock = yamlKeyBlock(release, "", "on");
  assert.match(onBlock, /workflow_dispatch:/);
  assert.doesNotMatch(onBlock, /^\s+push:/m);
  assert.doesNotMatch(onBlock, /paths:/);
});

test("release.yml accepts bump, branch, and release notes inputs", () => {
  const release = readFileSync(
    join(root, ".github/workflows/release.yml"),
    "utf8",
  );
  const inputs = yamlKeyBlock(release, "    ", "inputs");
  assert.match(inputs, /bump:/);
  assert.match(inputs, /type: choice/);
  assert.match(inputs, /- patch/);
  assert.match(inputs, /- minor/);
  assert.match(inputs, /- major/);
  assert.match(inputs, /default: patch/);
  assert.match(inputs, /branch:/);
  assert.match(inputs, /default: main/);
  assert.match(inputs, /release_notes:/);
  assert.match(yamlKeyBlock(release, "      ", "release_notes"), /type: string/);
  assert.doesNotMatch(yamlKeyBlock(release, "      ", "release_notes"), /type: textarea/);
});

test("release.yml validates the branch as a git branch name", () => {
  const release = readFileSync(
    join(root, ".github/workflows/release.yml"),
    "utf8",
  );
  assert.match(release, /git check-ref-format --branch/);
  assert.match(release, /\[\[ "\$\{BRANCH\}" == refs\/\* \]\]/);
  assert.doesNotMatch(release, /\^\[A-Za-z0-9\._\/-\]\+\$/);
});

test("release.yml bumps the version, tags, and creates a GitHub release", () => {
  const release = readFileSync(
    join(root, ".github/workflows/release.yml"),
    "utf8",
  );
  assert.match(release, /bump-version\.mjs "\$\{\{ inputs\.bump \}\}"/);
  assert.match(release, /git tag "\$\{VERSION\}"/);
  assert.match(release, /git push origin "refs\/tags\/\$\{VERSION\}"/);
  assert.match(release, /action-gh-release/);
  assert.match(release, /tag_name: \$\{\{ steps\.version\.outputs\.version \}\}/);
  assert.match(release, /body: \$\{\{ inputs\.release_notes \}\}/);
  assert.match(release, /generate_release_notes: true/);
});

test("codeql.yml pull requests stay unfiltered", () => {
  const codeql = readFileSync(
    join(root, ".github/workflows/codeql.yml"),
    "utf8",
  );
  assert.doesNotMatch(yamlKeyBlock(codeql, "  ", "pull_request"), /paths:/);
});

test("manifest authorUrl points at the GitHub profile, not the plugin repo", () => {
  const manifest = JSON.parse(
    readFileSync(join(root, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.authorUrl, "https://github.com/justinw0ng");
  assert.equal(String(manifest.authorUrl).includes("obsidian-atomic"), false);
});
