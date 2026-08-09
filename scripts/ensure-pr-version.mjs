#!/usr/bin/env node
/**
 * Ensure a PR branch has a version ready to merge/release.
 *
 * - If PR version == main: bump patch (writes version files)
 * - If PR version > main: leave as-is
 * - If PR version < main: exit 1 (conflict; do not invent a version)
 *
 * Usage:
 *   node scripts/ensure-pr-version.mjs <main-version>
 *
 * Prints the resulting PR version to stdout. Exit 0 means version files may
 * have been updated (caller should commit if the worktree is dirty).
 */
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { compareSemver, parseSemver } from "./semver.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mainVersion = process.argv[2];

if (!mainVersion) {
  console.error("Usage: ensure-pr-version.mjs <main-version>");
  process.exit(2);
}

parseSemver(mainVersion);

const manifest = JSON.parse(
  readFileSync(join(root, "manifest.json"), "utf8"),
);
const current = manifest.version;
parseSemver(current);

const cmp = compareSemver(current, mainVersion);

if (cmp < 0) {
  console.error(
    `Version conflict: PR version ${current} is older than main (${mainVersion}).\n` +
      `Set the plugin version above ${mainVersion} before merging.`,
  );
  process.exit(1);
}

if (cmp === 0) {
  const bump = spawnSync(
    process.execPath,
    [join(root, "scripts/bump-version.mjs"), "patch"],
    { encoding: "utf8" },
  );
  if (bump.status !== 0) {
    process.stderr.write(bump.stderr || bump.stdout || "bump failed\n");
    process.exit(bump.status ?? 1);
  }
  const next = bump.stdout.trim();
  console.error(`PR version matched main (${mainVersion}); bumped to ${next}`);
  process.stdout.write(`${next}\n`);
  process.exit(0);
}

console.error(`PR version ${current} is already ahead of main (${mainVersion})`);
process.stdout.write(`${current}\n`);
