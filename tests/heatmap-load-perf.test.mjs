import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTimeLog } from "../src/core/hobby.ts";
import { BLUE, GREEN, ORANGE } from "../src/types.ts";
import { durationMapFromHobbyLogs, durationMapFromSessions } from "../src/util/duration-map.ts";
import { markdownFilesInFolder } from "../src/util/folder-files.ts";
import {
  buildHeatmapWeeks,
  heatmapWeeksHtml,
} from "../src/util/heatmap-model.ts";
import { sessionMetaFromFile } from "../src/util/session-meta.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function ymd(year, index) {
  const dt = new Date(Date.UTC(year, 0, 1 + index));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function mdFile(path, basename) {
  return { path, basename, extension: "md" };
}

function yearFolder(folder, year, count) {
  const prefix = `${folder}/${year}`;
  return {
    path: prefix,
    children: Array.from({ length: count }, (_, i) => {
      const date = ymd(year, i);
      return mdFile(`${prefix}/${date}.md`, date);
    }),
  };
}

function itemsFolder(folder, count) {
  const prefix = `${folder}/Items`;
  return {
    path: prefix,
    children: Array.from({ length: count }, (_, i) =>
      mdFile(`${prefix}/Book ${i + 1}.md`, `Book ${i + 1}`),
    ),
  };
}

test("four heatmaps over 1000+ notes load within 500ms without scanning unrelated files", () => {
  const year = 2026;
  const gym = yearFolder("atomics/exercise/Gym", year, 365);
  const golf = yearFolder("atomics/exercise/Golf", year, 365);
  const guitar = yearFolder("atomics/exercise/Guitar", year, 365);
  const reading = itemsFolder("atomics/hobbies/Reading", 80);
  const unrelated = {
    path: "Daily",
    children: Array.from({ length: 1000 }, (_, i) =>
      mdFile(`Daily/${year}-note-${i}.md`, `${year}-note-${i}`),
    ),
  };
  const vault = {
    path: "",
    children: [gym, golf, guitar, reading, unrelated],
  };

  const t0 = performance.now();
  const gymFiles = markdownFilesInFolder(gym);
  const golfFiles = markdownFilesInFolder(golf);
  const guitarFiles = markdownFilesInFolder(guitar);
  const readingFiles = markdownFilesInFolder(reading);
  const maps = [
    durationMapFromSessions(
      gymFiles.map((file) =>
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: { duration_min: 40 },
        }),
      ),
    ),
    durationMapFromSessions(
      golfFiles.map((file) =>
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: { duration_min: 25 },
        }),
      ),
    ),
    durationMapFromSessions(
      guitarFiles.map((file) =>
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: { duration_min: 15 },
        }),
      ),
    ),
    durationMapFromHobbyLogs(
      readingFiles.map((file, i) => ({
        path: file.path,
        entries: parseTimeLog(
          `## Time log\n\n- ${ymd(year, i % 365)} | ${20 + (i % 10)} min | page\n`,
        ),
      })),
      year,
    ),
  ];
  const colors = [GREEN, ORANGE, GREEN, BLUE];
  const html = maps.map((activityMap, i) => {
    const weeks = buildHeatmapWeeks({
      year,
      todayStr: `${year}-08-14`,
      language: "en",
      activityMap,
    });
    return heatmapWeeksHtml(
      weeks,
      colors[i],
      "{date}: {minutes} min",
      "{date}: {minutes} min - click to open",
    );
  });
  const elapsed = performance.now() - t0;

  assert.equal(gymFiles.length, 365);
  assert.equal(golfFiles.length, 365);
  assert.equal(guitarFiles.length, 365);
  assert.equal(readingFiles.length, 80);
  assert.equal(markdownFilesInFolder(unrelated).length, 1000);
  assert.equal(markdownFilesInFolder(vault).length, 1000 + 365 * 3 + 80);
  assert.equal(html.length, 4);
  for (const markup of html) {
    assert.match(markup, /data-testid="atomic-heatmap-today"/);
    assert.match(markup, /data-testid="atomic-heatmap-cell"/);
  }
  assert.ok(
    elapsed < 500,
    `four heatmaps + 1000 notes took ${elapsed.toFixed(1)}ms`,
  );
});

test("vault scans no longer iterate getMarkdownFiles", () => {
  const source = readFileSync(join(root, "src/data/vault-source.ts"), "utf8");
  assert.match(source, /markdownFilesInFolder/);
  assert.match(source, /getActivityDurationMap/);
  assert.doesNotMatch(source, /getMarkdownFiles/);
});

test("plugin does not refresh every metadataCache changed event", () => {
  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  assert.match(main, /consumeNeedsMetadataRefresh/);
  assert.doesNotMatch(main, /metadataCache\.on\("changed"/);
  assert.match(main, /invalidateListCache\(path\)/);
});
