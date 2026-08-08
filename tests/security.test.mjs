import test from "node:test";
import assert from "node:assert/strict";
import {
  isSafeVaultFolder,
  sessionScanPrefix,
} from "../src/util/vault-path.ts";
import { yamlScalar } from "../src/util/yaml.ts";

test("isSafeVaultFolder rejects empty and whitespace", () => {
  assert.equal(isSafeVaultFolder(""), false);
  assert.equal(isSafeVaultFolder("   "), false);
  assert.equal(isSafeVaultFolder("\t"), false);
});

test("isSafeVaultFolder rejects path traversal segments", () => {
  assert.equal(isSafeVaultFolder(".."), false);
  assert.equal(isSafeVaultFolder("../Gym"), false);
  assert.equal(isSafeVaultFolder("Gym/../Golf"), false);
  assert.equal(isSafeVaultFolder("Gym/.."), false);
  assert.equal(isSafeVaultFolder("./Gym"), false);
  assert.equal(isSafeVaultFolder("Gym/./sub"), false);
});

test("isSafeVaultFolder rejects absolute-style paths", () => {
  assert.equal(isSafeVaultFolder("/Gym"), false);
  assert.equal(isSafeVaultFolder("C:/Gym"), false);
  assert.equal(isSafeVaultFolder("c:\\Gym"), false);
});

test("isSafeVaultFolder accepts vault-relative folders", () => {
  assert.equal(isSafeVaultFolder("Gym"), true);
  assert.equal(isSafeVaultFolder("Golf"), true);
  assert.equal(isSafeVaultFolder("Fitness/Gym"), true);
  assert.equal(isSafeVaultFolder("My Gym"), true);
});

test("sessionScanPrefix rejects unsafe folders and adds year boundary", () => {
  assert.equal(sessionScanPrefix("", 2026), null);
  assert.equal(sessionScanPrefix("..", 2026), null);
  assert.equal(sessionScanPrefix("Gym", 2026), "Gym/2026/");
  assert.equal(sessionScanPrefix("Fitness/Gym", 2026), "Fitness/Gym/2026/");
});

test("yamlScalar double-quotes and escapes", () => {
  assert.equal(yamlScalar(""), `""`);
  assert.equal(yamlScalar("Home"), `"Home"`);
  assert.equal(yamlScalar(`say "hi"`), `"say \\"hi\\""`);
  assert.equal(yamlScalar("a\\b"), `"a\\\\b"`);
  assert.equal(yamlScalar("line1\nline2"), `"line1\\nline2"`);
  assert.equal(yamlScalar("a: b"), `"a: b"`);
});
