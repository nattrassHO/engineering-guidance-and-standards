import test from "node:test";
import assert from "node:assert/strict";

import dlAsSummaryList from "../../../lib/markdown/dl-as-govuk-summary-list.js";

function createMarkdownRendererMock() {
  return { renderer: { rules: {} } };
}

test("registers markdown renderer rules", () => {
  const md = createMarkdownRendererMock();

  dlAsSummaryList(md);

  assert.equal(typeof md.renderer.rules.dl_open, "function");
  assert.equal(typeof md.renderer.rules.dt_open, "function");
  assert.equal(typeof md.renderer.rules.dd_open, "function");
  assert.equal(typeof md.renderer.rules.dl_close, "function");
});

test("wraps rows and closes previous row before opening next key", () => {
  const md = createMarkdownRendererMock();
  dlAsSummaryList(md);

  assert.equal(md.renderer.rules.dl_open(), '<dl class="govuk-summary-list">\n');

  const firstDt = md.renderer.rules.dt_open();
  assert.match(firstDt, /^<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">\n$/);

  const secondDt = md.renderer.rules.dt_open();
  assert.match(secondDt, /^<\/div><div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">\n$/);

  assert.equal(md.renderer.rules.dd_open(), '<dt class="govuk-summary-list__value">\n');
  assert.equal(md.renderer.rules.dl_close(), "</div></dl>");
});

test("resets row state after close", () => {
  const md = createMarkdownRendererMock();
  dlAsSummaryList(md);

  md.renderer.rules.dt_open();
  md.renderer.rules.dl_close();

  assert.equal(
    md.renderer.rules.dt_open(),
    '<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">\n'
  );
});
