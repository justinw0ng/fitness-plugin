import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("plugin UI keeps stable Selenium data-testid hooks", () => {
  const heatmap = src("src/views/heatmap.ts");
  assert.match(heatmap, /data-testid": "atomic-heatmap"/);
  assert.match(heatmap, /data-testid": "atomic-heatmap-invalid"/);
  assert.match(heatmap, /appendHeatmapWeeks/);
  assert.doesNotMatch(heatmap, /innerHTML/);

  const heatmapModel = src("src/util/heatmap-model.ts");
  assert.match(heatmapModel, /"atomic-heatmap-today"/);
  assert.match(heatmapModel, /"atomic-heatmap-cell"/);
  assert.match(heatmapModel, /appendHeatmapWeeks/);
  assert.match(heatmapModel, /createDiv\(/);
  assert.doesNotMatch(heatmapModel, /createElement\(/);
  assert.doesNotMatch(heatmapModel, /createDocumentFragment\(/);

  const timer = src("src/views/timer.ts");
  assert.match(timer, /data-testid": "atomic-timer-start"/);
  assert.match(timer, /data-testid": "atomic-timer-stop"/);

  const cues = src("src/views/cues.ts");
  assert.match(cues, /data-testid": "atomic-cues"/);

  const shelf = src("src/views/book-shelf.ts");
  assert.match(shelf, /data-testid": "atomic-bookshelf"/);
  assert.match(shelf, /data-testid": "atomic-book"/);

  const settings = src("src/settings.ts");
  assert.match(settings, /atomic-setting-activity/);
  assert.match(settings, /atomic-setting-add-hobby/);
  assert.match(settings, /atomic-color-swatch/);
  assert.match(settings, /getSettingDefinitions\(/);
  assert.doesNotMatch(settings, /setWarning\(/);
  assert.doesNotMatch(settings, /setDestructive\(/);
  assert.doesNotMatch(settings, /\.update\(/);
  assert.doesNotMatch(settings, /this\.display\(/);

  const properties = src("src/properties/property-select.ts");
  assert.match(properties, /"data-testid": "atomic-property-select"/);

  const styles = src("styles.css");
  assert.doesNotMatch(styles, /:has\(/);
  assert.doesNotMatch(styles, /!important/);
  assert.doesNotMatch(styles, /scrollbar-width/);
});
