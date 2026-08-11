import test from "node:test";
import assert from "node:assert/strict";
import { parseBlockOptions } from "../src/util/parse-block.ts";

test("parseBlockOptions parses hyphenated keys", () => {
  const opts = parseBlockOptions("min-column-width: 300\ndefault-span: 1.2\n");
  assert.equal(opts["min-column-width"], "300");
  assert.equal(opts["default-span"], "1.2");
});

test("parseBlockOptions strips trailing hash comments from values", () => {
  const opts = parseBlockOptions("rows: 2 # default: 1\ncolumns: 2 # default: 1\n");
  assert.equal(opts.rows, "2");
  assert.equal(opts.columns, "2");
});

test("parseBlockOptions skips full-line hash comments", () => {
  const opts = parseBlockOptions(
    "# layout options\nrows: 2\n# columns: 99\ncolumns: 2\n",
  );
  assert.equal(opts.rows, "2");
  assert.equal(opts.columns, "2");
  assert.equal(opts["# layout options"], undefined);
});

test("parseBlockOptions strips quoted values", () => {
  const opts = parseBlockOptions('activity: "reading"\nstatus: \'to-read\'\n');
  assert.equal(opts.activity, "reading");
  assert.equal(opts.status, "to-read");
});

test("parseBlockOptions ignores blank lines", () => {
  const opts = parseBlockOptions("\n\nyear: 2026\n\n");
  assert.deepEqual(opts, { year: "2026" });
});
