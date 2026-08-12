import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOOK_GAP_PX,
  DEFAULT_BOOK_HEIGHT_PX,
  DEFAULT_BOOK_WIDTH_PX,
  MIN_BOOK_WIDTH_PX,
  MIN_BOOKS_PER_ROW,
  ROW_PADDING_PX,
  bookHeightForWidth,
  bookWidthForContainer,
  booksPerRow,
  chunkItems,
  rowNeedsHorizontalScroll,
} from "../src/util/book-shelf-layout.ts";
import { measureElementWidth } from "../src/util/element-width.ts";
import {
  HEATMAP_CELL_PX,
  HEATMAP_DAY_LABEL_PX,
  HEATMAP_GAP_PX,
  HEATMAP_SCROLL_PAD_PX,
  heatmapBodyMinWidth,
  heatmapNeedsHorizontalScroll,
  heatmapWeeksWidth,
} from "../src/util/heatmap-metrics.ts";
import { hobbyItemFromFileCache } from "../src/util/hobby-item-scan.ts";
import { parseCoverRef } from "../src/views/book-shelf.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const styles = readFileSync(join(root, "styles.css"), "utf8");

const IPHONE_SE = 320;
const IPHONE_14 = 390;
const PIXEL_NARROW = 360;

test("bookWidthForContainer keeps default size on wide panes", () => {
  assert.equal(bookWidthForContainer(900), DEFAULT_BOOK_WIDTH_PX);
  assert.equal(bookHeightForWidth(DEFAULT_BOOK_WIDTH_PX), DEFAULT_BOOK_HEIGHT_PX);
});

test("bookWidthForContainer shrinks so three books fit on a phone pane", () => {
  const width = bookWidthForContainer(IPHONE_SE);
  assert.ok(width <= DEFAULT_BOOK_WIDTH_PX);
  assert.ok(width >= MIN_BOOK_WIDTH_PX);
  const needed =
    ROW_PADDING_PX + 3 * width + 2 * BOOK_GAP_PX;
  assert.ok(
    needed <= IPHONE_SE,
    `three ${width}px books need ${needed}px, pane is ${IPHONE_SE}px`,
  );
});

test("bookWidthForContainer floors at MIN_BOOK_WIDTH_PX on tiny panes", () => {
  assert.equal(bookWidthForContainer(120), MIN_BOOK_WIDTH_PX);
  assert.equal(rowNeedsHorizontalScroll(120, MIN_BOOK_WIDTH_PX), true);
});

test("booksPerRow never wraps below three books", () => {
  assert.equal(MIN_BOOKS_PER_ROW, 3);
  assert.equal(booksPerRow(0), 3);
  assert.equal(booksPerRow(100), 3);
  assert.ok(booksPerRow(IPHONE_SE) >= 3);
  assert.ok(booksPerRow(IPHONE_14) >= 3);
  assert.ok(booksPerRow(900) >= 3);
});

test("booksPerRow still adds more books when the pane is wide", () => {
  const wide = booksPerRow(720, DEFAULT_BOOK_WIDTH_PX);
  assert.ok(wide >= 4);
  assert.deepEqual(chunkItems(["a", "b", "c", "d", "e"], 3), [
    ["a", "b", "c"],
    ["d", "e"],
  ]);
});

test("measureElementWidth walks parents when the frame is 0 (iOS first paint)", () => {
  const frame = {
    clientWidth: 0,
    getBoundingClientRect: () => ({ width: 0 }),
    parentElement: {
      clientWidth: 0,
      getBoundingClientRect: () => ({ width: 0 }),
      parentElement: {
        clientWidth: PIXEL_NARROW,
        getBoundingClientRect: () => ({ width: PIXEL_NARROW }),
        parentElement: null,
      },
    },
  };
  assert.equal(measureElementWidth(frame), PIXEL_NARROW);
  assert.equal(measureElementWidth({ clientWidth: 0 }, 414), 414);
  assert.equal(measureElementWidth(null, 0), 0);
});

test("heatmap year grid is narrower than the old 16px cells", () => {
  const weeks = 53;
  const width = heatmapWeeksWidth(weeks);
  const oldWidth = weeks * 16 + (weeks - 1) * 2;
  assert.ok(width < oldWidth);
  assert.equal(HEATMAP_CELL_PX, 11);
  assert.equal(HEATMAP_GAP_PX, 1);
  assert.ok(heatmapNeedsHorizontalScroll(IPHONE_SE, weeks));
  assert.ok(
    heatmapBodyMinWidth(weeks) ===
      HEATMAP_DAY_LABEL_PX + heatmapWeeksWidth(weeks),
  );
  assert.ok(HEATMAP_SCROLL_PAD_PX >= 3);
});

test("hobbyItemFromFileCache includes files before metadata is ready", () => {
  const pending = hobbyItemFromFileCache({
    path: "atomics/hobbies/Reading/Items/Atomic Habits.md",
    basename: "Atomic Habits",
    frontmatter: null,
    activityId: "reading",
  });
  assert.deepEqual(pending, {
    path: "atomics/hobbies/Reading/Items/Atomic Habits.md",
    basename: "Atomic Habits",
    frontmatter: {
      type: "atomic-item",
      activity: "reading",
      title: "Atomic Habits",
    },
  });
});

test("hobbyItemFromFileCache still rejects other activities once cache exists", () => {
  assert.equal(
    hobbyItemFromFileCache({
      path: "atomics/hobbies/Chess/Items/Game.md",
      basename: "Game",
      frontmatter: { type: "atomic-item", activity: "chess" },
      activityId: "reading",
    }),
    null,
  );
  assert.equal(
    hobbyItemFromFileCache({
      path: "atomics/hobbies/Reading/Items/Notes.md",
      basename: "Notes",
      frontmatter: {},
      activityId: "reading",
    }),
    null,
  );
  assert.equal(
    hobbyItemFromFileCache({
      path: "atomics/hobbies/Chess/Items/Game.md",
      basename: "Game",
      frontmatter: { type: "atomic-item", activity: "chess" },
      activityId: "reading",
    }),
    null,
  );
  const ok = hobbyItemFromFileCache({
    path: "atomics/hobbies/Reading/Items/Current.md",
    basename: "Current",
    frontmatter: { type: "atomic-item", activity: "reading", status: "reading" },
    activityId: "reading",
  });
  assert.equal(ok?.frontmatter.status, "reading");
});

test("parseCoverRef rejects javascript and non-raster data URLs", () => {
  assert.deepEqual(parseCoverRef("javascript:alert(1)"), { kind: "none" });
  assert.deepEqual(parseCoverRef("JAVASCRIPT:alert(1)"), { kind: "none" });
  assert.deepEqual(parseCoverRef("data:text/html,<script>x</script>"), {
    kind: "none",
  });
  assert.deepEqual(parseCoverRef("data:image/svg+xml,<svg></svg>"), {
    kind: "none",
  });
  assert.deepEqual(
    parseCoverRef("data:image/png;base64,iVBORw0KGgo="),
    { kind: "url", src: "data:image/png;base64,iVBORw0KGgo=" },
  );
});

test("styles hide atomic scrollbars, pin heatmap width, and theme the today ring", () => {
  assert.match(styles, /scrollbar-width:\s*none/);
  assert.match(styles, /::-webkit-scrollbar/);
  assert.match(styles, /--atomic-heatmap-cell:\s*11px/);
  assert.match(styles, /--atomic-book-width:\s*80px/);
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-heatmap-body\s*\{[^}]*min-width:\s*0/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-heatmap-scroll\s*\{[^}]*overflow-x:\s*auto/s,
  );
  assert.match(styles, /\.theme-dark[^{]*\.fitness-cell\.is-today/);
  assert.match(styles, /\.fitness-cell\.is-today[^}]*#000/s);
  assert.match(styles, /\.fitness-weeks-end-pad\s*\{/);
  assert.match(
    styles,
    /\.atomic-book-row-books\s*\{[^}]*overflow-x:\s*auto/s,
  );
});
