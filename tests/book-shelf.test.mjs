import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bookDetailFixedPosition,
  booksPerRow,
  buildBookShelfItems,
  chunkItems,
  coverObjectPosition,
  bookClickOpensNote,
  hoverFinePointer,
  isBookShelfUnclipStop,
  parseCoverRef,
  resolveCoverSrc,
  shelfColorFor,
  shouldUnclipBookShelfAncestor,
  titleLengthClass,
  unclipBookShelfAncestors,
} from "../src/views/book-shelf.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const stylesCss = readFileSync(join(repoRoot, "styles.css"), "utf8");

test("shelfColorFor uses valid spine_color and hashes missing colors", () => {
  assert.equal(
    shelfColorFor({
      title: "Atomic Habits",
      path: "atomics/hobbies/Reading/Items/Atomic Habits.md",
      spine_color: "#8B3A2A",
    }),
    "#8B3A2A",
  );
  assert.match(
    shelfColorFor({
      title: "Deep Work",
      path: "atomics/hobbies/Reading/Items/Deep Work.md",
    }),
    /^#[0-9a-f]{6}$/i,
  );
  assert.notEqual(
    shelfColorFor({
      title: "Deep Work",
      path: "atomics/hobbies/Reading/Items/Deep Work.md",
    }),
    shelfColorFor({
      title: "How to Read a Book",
      path: "atomics/hobbies/Reading/Items/How to Read a Book.md",
    }),
  );
});

test("buildBookShelfItems filters Reading atomic items and normalizes metadata", () => {
  const items = buildBookShelfItems([
    {
      path: "atomics/hobbies/Reading/Items/Finished.md",
      basename: "Finished",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "finished",
        authors: "Author One",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Current.md",
      basename: "Current",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "reading",
        authors: ["Author Two", "Author Three"],
        cover: "https://example.invalid/current.jpg",
        description: "A useful book.",
        spine_color: "#336699",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Other.md",
      basename: "Other",
      frontmatter: {
        type: "atomic-item",
        activity: "gaming",
      },
    },
  ]);

  assert.deepEqual(
    items.map((item) => item.title),
    ["Current", "Finished"],
  );
  assert.deepEqual(items[0], {
    path: "atomics/hobbies/Reading/Items/Current.md",
    title: "Current",
    authors: ["Author Two", "Author Three"],
    status: "reading",
    description: "A useful book.",
    spineColor: "#336699",
    cover: "https://example.invalid/current.jpg",
  });
  assert.deepEqual(items[1].authors, ["Author One"]);
});

test("buildBookShelfItems filters by status when requested", () => {
  const files = [
    {
      path: "atomics/hobbies/Reading/Items/Current.md",
      basename: "Current",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "reading",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Queue.md",
      basename: "Queue",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "to-read",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Done.md",
      basename: "Done",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "finished",
      },
    },
  ];

  assert.deepEqual(
    buildBookShelfItems(files, "reading", ["reading"]).map((item) => item.title),
    ["Current"],
  );
  assert.deepEqual(
    buildBookShelfItems(files, "reading", ["reading", "to-read"]).map(
      (item) => item.title,
    ),
    ["Current", "Queue"],
  );
  assert.equal(buildBookShelfItems(files, "reading", null).length, 3);
});

test("parseCoverRef accepts URLs, vault paths, and wikilinks", () => {
  assert.deepEqual(parseCoverRef(""), { kind: "none" });
  assert.deepEqual(parseCoverRef("https://example.invalid/a.jpg"), {
    kind: "url",
    src: "https://example.invalid/a.jpg",
  });
  assert.deepEqual(parseCoverRef("app://local/cover.png"), {
    kind: "url",
    src: "app://local/cover.png",
  });
  assert.deepEqual(
    parseCoverRef("[[atomics/hobbies/Reading/Covers/title.jpg]]"),
    {
      kind: "vault",
      path: "atomics/hobbies/Reading/Covers/title.jpg",
    },
  );
  assert.deepEqual(
    parseCoverRef("[[atomics/hobbies/Reading/Covers/title.jpg|Cover]]"),
    {
      kind: "vault",
      path: "atomics/hobbies/Reading/Covers/title.jpg",
    },
  );
  assert.deepEqual(parseCoverRef("atomics/hobbies/Reading/Covers/title.jpg"), {
    kind: "vault",
    path: "atomics/hobbies/Reading/Covers/title.jpg",
  });
});

test("resolveCoverSrc uses URLs directly and vault resolver for paths", () => {
  const data = {
    resolveResourcePath(path, sourcePath) {
      assert.equal(path, "atomics/hobbies/Reading/Covers/title.jpg");
      assert.equal(sourcePath, "atomics/hobbies/Reading/Items/Current.md");
      return "app://local/resolved.jpg";
    },
  };

  assert.equal(
    resolveCoverSrc(
      "https://example.invalid/a.jpg",
      data,
      "atomics/hobbies/Reading/Items/Current.md",
    ),
    "https://example.invalid/a.jpg",
  );
  assert.equal(
    resolveCoverSrc(
      "[[atomics/hobbies/Reading/Covers/title.jpg]]",
      data,
      "atomics/hobbies/Reading/Items/Current.md",
    ),
    "app://local/resolved.jpg",
  );
  assert.equal(
    resolveCoverSrc("", data, "atomics/hobbies/Reading/Items/Current.md"),
    null,
  );
});

test("bookClickOpensNote waits for a second tap on coarse pointers", () => {
  assert.equal(bookClickOpensNote({ hoverFine: true, coverOpen: false }), true);
  assert.equal(bookClickOpensNote({ hoverFine: true, coverOpen: true }), true);
  assert.equal(bookClickOpensNote({ hoverFine: false, coverOpen: false }), false);
  assert.equal(bookClickOpensNote({ hoverFine: false, coverOpen: true }), true);
});

test("hoverFinePointer follows the hover+fine media query", () => {
  assert.equal(hoverFinePointer(null), false);
  assert.equal(hoverFinePointer({ matches: false }), false);
  assert.equal(hoverFinePointer({ matches: true }), true);
});

test("coverObjectPosition crops wide 3D mockups to the front face", () => {
  // Upright 2:3 (and the shelf face ~80×124) stay centered.
  assert.equal(coverObjectPosition(400, 600), "center");
  assert.equal(coverObjectPosition(80, 124), "center");
  // Photos / 3D renders that include a left spine are wider than 2:3.
  assert.equal(coverObjectPosition(500, 600), "right center");
  assert.equal(coverObjectPosition(510, 600), "right center");
  assert.equal(coverObjectPosition(0, 600), "center");
  assert.equal(coverObjectPosition(400, 0), "center");
});

test("titleLengthClass shrinks type for long book titles", () => {
  assert.equal(titleLengthClass("Blink"), "");
  assert.equal(titleLengthClass("Building a Second Brain"), "is-title-sm");
  assert.equal(
    titleLengthClass("Thinking, Fast and Slow — Annotated Edition"),
    "is-title-xs",
  );
});

test("booksPerRow and chunkItems wrap to multiple shelf rows by width", () => {
  assert.equal(booksPerRow(0), 3);
  assert.equal(booksPerRow(100), 3);
  // Never wrap below 3; 20 + 3*80 + 2*6 = 272
  assert.equal(booksPerRow(272), 3);
  // 20 + 4*80 + 3*6 = 358
  assert.equal(booksPerRow(358), 4);
  // 20 + 8*80 + 7*6 = 702
  assert.equal(booksPerRow(702), 8);

  assert.deepEqual(chunkItems([], 3), [[]]);
  assert.deepEqual(
    chunkItems(["a", "b", "c", "d", "e"], 2),
    [["a", "b"], ["c", "d"], ["e"]],
  );
});

test("shouldUnclipBookShelfAncestor targets codeblock wrappers only", () => {
  assert.equal(shouldUnclipBookShelfAncestor("cm-preview-code-block"), true);
  assert.equal(shouldUnclipBookShelfAncestor("markdown-rendered-code-block"), true);
  assert.equal(shouldUnclipBookShelfAncestor("cm-embed-block"), true);
  assert.equal(shouldUnclipBookShelfAncestor("internal-embed markdown-embed"), true);
  assert.equal(shouldUnclipBookShelfAncestor("markdown-preview-sizer"), false);
  assert.equal(shouldUnclipBookShelfAncestor(""), false);
});

test("isBookShelfUnclipStop keeps note scroll containers intact", () => {
  assert.equal(isBookShelfUnclipStop("markdown-preview-view"), true);
  assert.equal(isBookShelfUnclipStop("markdown-source-view mod-cm6"), true);
  assert.equal(isBookShelfUnclipStop("cm-scroller"), true);
  assert.equal(isBookShelfUnclipStop("workspace-leaf-content"), true);
  assert.equal(isBookShelfUnclipStop("cm-preview-code-block"), false);
});

test("unclipBookShelfAncestors opens codeblock overflow and stops at the note scroller", () => {
  const overflowEl = (className, overflow, parent = null) => {
    const el = {
      className,
      style: { overflow },
      parentElement: parent,
      setCssStyles(styles) {
        Object.assign(this.style, styles);
      },
    };
    return el;
  };
  const scroller = overflowEl("cm-scroller", "auto");
  const sizer = overflowEl("markdown-preview-sizer", "auto", scroller);
  const preview = overflowEl(
    "cm-preview-code-block markdown-rendered-code-block",
    "hidden",
    sizer,
  );
  const host = overflowEl("", "hidden", preview);
  const el = overflowEl("", "hidden", host);

  unclipBookShelfAncestors(el);

  assert.equal(el.style.overflow, "visible");
  assert.equal(host.style.overflow, "visible");
  assert.equal(preview.style.overflow, "visible");
  assert.equal(sizer.style.overflow, "auto");
  assert.equal(scroller.style.overflow, "auto");
});

test("bookDetailFixedPosition centers the bubble above the book", () => {
  assert.deepEqual(
    bookDetailFixedPosition({
      bookTop: 200,
      bookLeft: 40,
      bookWidth: 108,
      gap: 8,
    }),
    { left: 94, top: 192 },
  );
});

test("book shelf ports hover details to document.body", () => {
  const source = readFileSync(
    join(repoRoot, "src/views/book-shelf.ts"),
    "utf8",
  );
  assert.match(source, /ownerDocument/);
  assert.match(source, /appendChild\(detail\)/);
  assert.match(source, /bookDetailFixedPosition/);
  assert.match(source, /is-ported/);
  assert.match(
    source,
    /if\s*\(\s*!button\.isConnected\s*\)\s*\{[^}]*hide\(\)/s,
  );
  assert.match(source, /portal\.hide\(\)[\s\S]*?openPath/);
});

test("book shelf CSS lets cover hover reach the book button and keeps the title bubble visible", () => {
  assert.match(
    stylesCss,
    /\.fitness-plugin\s+\.atomic-book\s+\*\s*\{[^}]*pointer-events:\s*none/s,
  );
  assert.match(
    stylesCss,
    /img\.atomic-book-cover-image[^{]*\{[^}]*pointer-events:\s*none/s,
  );
  assert.doesNotMatch(stylesCss, /:has\(/);
  assert.doesNotMatch(stylesCss, /!important/);
  assert.match(
    stylesCss,
    /\.atomic-book-detail\.is-ported[^{]*\{[^}]*position:\s*fixed/s,
  );
  assert.match(
    stylesCss,
    /\.theme-dark[\s\S]*?\.atomic-book-detail[\s\S]*?background:\s*#fff/,
  );
  assert.match(
    stylesCss,
    /\.theme-dark[\s\S]*?\.atomic-book-detail[\s\S]*?color:\s*#111/,
  );
  assert.match(
    stylesCss,
    /\.atomic-book-detail::after[^{]*\{[^}]*border-top-color/s,
  );
});
