import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBookShelfItems,
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
