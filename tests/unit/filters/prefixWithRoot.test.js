import test from "node:test";
import assert from "node:assert/strict";

import prefixWithRoot from "../../../lib/filters/prefixWithRoot.js";

test("joins a clean root and path", () => {
  assert.equal(prefixWithRoot("standards", "https://example.com"), "https://example.com/standards");
});

test("removes trailing slash from root and leading slash from path", () => {
  assert.equal(prefixWithRoot("/standards", "https://example.com/"), "https://example.com/standards");
});

test("keeps nested path segments", () => {
  assert.equal(prefixWithRoot("/patterns/code-reviews", "https://example.com/"), "https://example.com/patterns/code-reviews");
});
