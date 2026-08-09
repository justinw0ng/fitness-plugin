import test from "node:test";
import assert from "node:assert/strict";
import { mergeSettings } from "../src/util/merge-settings.ts";
import { rewriteFitnessCuesFences } from "../src/util/migrate-cues.ts";

test("mergeSettings defaults include golf/gym paths and legacy on", () => {
  const s = mergeSettings(null);
  assert.equal(s.golfCuesPath, "Golf/Cues.md");
  assert.equal(s.gymCuesPath, "Gym/Cues.md");
  assert.equal(s.deprecatedFitnessCuesEnabled, true);
  assert.equal("cuesPath" in s, false);
});

test("mergeSettings maps legacy cuesPath to golfCuesPath", () => {
  const s = mergeSettings({ cuesPath: "Custom/GolfCues.md" });
  assert.equal(s.golfCuesPath, "Custom/GolfCues.md");
});

test("mergeSettings prefers golfCuesPath over cuesPath", () => {
  const s = mergeSettings({
    cuesPath: "Old.md",
    golfCuesPath: "New.md",
  });
  assert.equal(s.golfCuesPath, "New.md");
});

test("mergeSettings respects deprecatedFitnessCuesEnabled false", () => {
  const s = mergeSettings({ deprecatedFitnessCuesEnabled: false });
  assert.equal(s.deprecatedFitnessCuesEnabled, false);
});

test("rewriteFitnessCuesFences rewrites fence language only", () => {
  const input = `# Cues\n\nUse fitness-cues in prose.\n\n\`\`\`fitness-cues\nyear: 2026\n\`\`\`\n`;
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /```fitness-golf-cues\n/);
  assert.match(markdown, /Use fitness-cues in prose/);
  assert.doesNotMatch(markdown, /```fitness-cues\b/);
});

test("rewriteFitnessCuesFences is idempotent for new name", () => {
  const input = "```fitness-golf-cues\n```\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 0);
  assert.equal(markdown, input);
});

test("rewriteFitnessCuesFences handles tildes and info strings", () => {
  const input = "~~~fitness-cues extra\nyear: 1\n~~~\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /~~~fitness-golf-cues extra\n/);
});

test("rewriteFitnessCuesFences ignores nested fences inside docs samples", () => {
  const input = [
    "Example:",
    "````markdown",
    "```fitness-cues",
    "year: 2026",
    "```",
    "````",
    "",
    "```fitness-cues",
    "year: 2026",
    "```",
    "",
  ].join("\n");
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /````markdown\n```fitness-cues\n/);
  assert.match(markdown, /\n```fitness-golf-cues\n/);
});

test("rewriteFitnessCuesFences rewrites indented top-level fences", () => {
  const input = "  ```fitness-cues\nyear: 1\n  ```\n";
  const { markdown, replacements } = rewriteFitnessCuesFences(input);
  assert.equal(replacements, 1);
  assert.match(markdown, /^ {2}```fitness-golf-cues\n/);
});
