import test from "node:test";
import assert from "node:assert/strict";
import {
  booksPerRow,
  buildBookShelfItems,
  chunkItems,
  parseCoverRef,
  resolveCoverSrc,
  shelfColorFor,
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

test("booksPerRow and chunkItems wrap to multiple shelf rows by width", () => {
  assert.equal(booksPerRow(0), 1);
  assert.equal(booksPerRow(100), 1);
  // 16px padding + one 86px book = 102; two books need 16 + 86*2 + 8 = 196
  assert.equal(booksPerRow(102), 1);
  assert.equal(booksPerRow(196), 2);
  assert.equal(booksPerRow(800), 8);

  assert.deepEqual(chunkItems([], 3), [[]]);
  assert.deepEqual(
    chunkItems(["a", "b", "c", "d", "e"], 2),
    [["a", "b"], ["c", "d"], ["e"]],
  );
});
