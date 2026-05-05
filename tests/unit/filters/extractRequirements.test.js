import test from "node:test";
import assert from "node:assert/strict";

import extractRequirements from "../../../lib/filters/extractRequirements.js";

test("extracts requirement links from a requirement section", () => {
  const html = `
    <h2>Requirements</h2>
    <ul>
      <li><a href="#r1">A requirement</a></li>
      <li><a href="#r2">Another requirement</a></li>
    </ul>
  `;

  assert.deepEqual(extractRequirements(html), [
    { title: "A requirement", id: "#r1" },
    { title: "Another requirement", id: "#r2" }
  ]);
});

test("matches requirement heading case-insensitively", () => {
  const html = `
    <h2>requirement details</h2>
    <ul>
      <li><a href="#req-1">First</a></li>
    </ul>
  `;

  assert.deepEqual(extractRequirements(html), [
    { title: "First", id: "#req-1" }
  ]);
});
