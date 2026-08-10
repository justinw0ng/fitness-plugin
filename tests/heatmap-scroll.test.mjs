import test from "node:test";
import assert from "node:assert/strict";
import { scrollLeftToAlignRight } from "../src/util/heatmap-scroll.ts";

test("scrollLeftToAlignRight aligns mid-year target to right edge", () => {
  // scrollWidth=1000, clientWidth=300 → max scrollLeft=700
  // targetRightPx=500 → desired scrollLeft=500-300=200
  assert.equal(scrollLeftToAlignRight(1000, 300, 500), 200);
});

test("scrollLeftToAlignRight returns 0 when content does not overflow", () => {
  assert.equal(scrollLeftToAlignRight(200, 300, 150), 0);
});

test("scrollLeftToAlignRight clamps when target is past max scroll", () => {
  // targetRightPx=1200 → desired=900, max=700
  assert.equal(scrollLeftToAlignRight(1000, 300, 1200), 700);
});

test("scrollLeftToAlignRight clamps when target is before viewport", () => {
  // targetRightPx=100 → desired=-200 → 0
  assert.equal(scrollLeftToAlignRight(1000, 300, 100), 0);
});

test("scrollLeftToAlignRight returns 0 when scrollWidth equals clientWidth", () => {
  assert.equal(scrollLeftToAlignRight(300, 300, 250), 0);
});

test("scrollLeftToAlignRight returns 0 for non-finite or negative sizes", () => {
  assert.equal(scrollLeftToAlignRight(NaN, 300, 500), 0);
  assert.equal(scrollLeftToAlignRight(1000, Infinity, 500), 0);
  assert.equal(scrollLeftToAlignRight(-100, 300, 500), 0);
  assert.equal(scrollLeftToAlignRight(1000, -50, 500), 0);
});
