import test from "node:test";
import assert from "node:assert/strict";

import escapeCsvCell from "../../../lib/filters/escapeCsvCell.js";

test("returns original cell when no escaping is needed", () => {
  assert.equal(escapeCsvCell("plain text"), "plain text");
});

test("escapes commas by wrapping content in double quotes", () => {
  assert.equal(escapeCsvCell("a,b"), '"a,b"');
});

test("escapes embedded quotes by doubling them", () => {
  assert.equal(escapeCsvCell('a "quote" b'), '"a ""quote"" b"');
});

test("escapes new lines by wrapping content in double quotes", () => {
  assert.equal(escapeCsvCell("line1\nline2"), '"line1\nline2"');
});
