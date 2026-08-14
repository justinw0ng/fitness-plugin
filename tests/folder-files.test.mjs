import test from "node:test";
import assert from "node:assert/strict";
import { markdownFilesInFolder } from "../src/util/folder-files.ts";

function mdFile(folder, name) {
  return {
    path: `${folder}/${name}.md`,
    basename: name,
    extension: "md",
  };
}

test("markdownFilesInFolder walks only the given folder tree", () => {
  const gym2026 = {
    path: "atomics/exercise/Gym/2026",
    children: [mdFile("atomics/exercise/Gym/2026", "2026-01-01")],
  };
  const daily = {
    path: "Daily",
    children: Array.from({ length: 20 }, (_, i) =>
      mdFile("Daily", `note-${String(i).padStart(3, "0")}`),
    ),
  };
  const vault = {
    path: "",
    children: [gym2026, daily],
  };

  assert.equal(markdownFilesInFolder(gym2026).length, 1);
  assert.equal(markdownFilesInFolder(daily).length, 20);
  assert.equal(markdownFilesInFolder(vault).length, 21);
  assert.equal(markdownFilesInFolder(null).length, 0);
});

test("markdownFilesInFolder skips non-markdown files", () => {
  const folder = {
    path: "atomics/hobbies/Reading/Items",
    children: [
      mdFile("atomics/hobbies/Reading/Items", "Book"),
      {
        path: "atomics/hobbies/Reading/Items/cover.png",
        basename: "cover",
        extension: "png",
      },
    ],
  };
  assert.deepEqual(
    markdownFilesInFolder(folder).map((file) => file.basename),
    ["Book"],
  );
});
