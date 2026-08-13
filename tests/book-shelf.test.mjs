import test from "node:test";
import assert from "node:assert/strict";
import {
  booksPerRow,
  buildBookShelfItems,
  chunkItems,
  coverObjectPosition,
  parseCoverRef,
  resolveCoverSrc,
  shelfColorFor,
  titleLengthClass,
} from "../src/views/book-shelf.ts";

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
