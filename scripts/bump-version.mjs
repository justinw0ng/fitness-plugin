#!/usr/bin/env node
/**
 * Bump or read the plugin semver across package.json, manifest.json, and versions.json.
 *
 * Usage:
 *   node scripts/bump-version.mjs              # print current version
 *   node scripts/bump-version.mjs patch|minor|major|none
 *
 * "none" leaves the version unchanged (useful for cutting the first release of
 * whatever is already declared in the repo).
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { bumpSemver } from "./semver.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(name) {
  return JSON.parse(readFileSync(join(root, name), "utf8"));
}

function writeJson(name, value) {
  writeFileSync(join(root, name), `${JSON.stringify(value, null, 2)}\n`);
}

const level = process.argv[2] ?? "print";
const pkg = readJson("package.json");
const manifest = readJson("manifest.json");
const versions = readJson("versions.json");

const current = manifest.version;
if (pkg.version !== current) {
  throw new Error(
    `Version mismatch: package.json=${pkg.version} manifest.json=${current}`,
  );
}

if (level === "print") {
  process.stdout.write(`${current}\n`);
  process.exit(0);
}

const allowed = new Set(["patch", "minor", "major", "none"]);
if (!allowed.has(level)) {
  throw new Error(`Usage: bump-version.mjs [patch|minor|major|none]`);
}

const next = level === "none" ? current : bumpSemver(current, level);
const minAppVersion = manifest.minAppVersion;

pkg.version = next;
manifest.version = next;
versions[next] = minAppVersion;

writeJson("package.json", pkg);
writeJson("manifest.json", manifest);
writeJson("versions.json", versions);

// Keep package-lock.json root version in sync when present.
try {
  const lock = readJson("package-lock.json");
  lock.version = next;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = next;
  }
  writeJson("package-lock.json", lock);
} catch {
  // optional
}

process.stdout.write(`${next}\n`);
