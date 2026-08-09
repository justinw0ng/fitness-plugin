#!/usr/bin/env node
/**
 * Fail if the PR/plugin version is the same as or older than main.
 *
 * Usage:
 *   node scripts/check-version-conflict.mjs <main-version>
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { compareSemver, parseSemver } from "./semver.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mainVersion = process.argv[2];

if (!mainVersion) {
  console.error("Usage: check-version-conflict.mjs <main-version>");
  process.exit(2);
}

parseSemver(mainVersion);

const manifest = JSON.parse(
  readFileSync(join(root, "manifest.json"), "utf8"),
);
const current = manifest.version;
parseSemver(current);

const cmp = compareSemver(current, mainVersion);
if (cmp <= 0) {
  const reason =
    cmp === 0
      ? `same as main (${mainVersion})`
      : `older than main (${current} < ${mainVersion})`;
  console.error(
    `Version conflict: PR version ${current} is ${reason}.\n` +
      `Bump the plugin version above main (or re-run CI after main advances so the auto patch bump can apply).`,
  );
  process.exit(1);
}

console.log(`Version OK: ${current} > main ${mainVersion}`);
