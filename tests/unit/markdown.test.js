"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { render, parseChapter, inline } = require("../../markdown.js");

test("inline formats bold, italics and code", () => {
  assert.equal(inline("**bold** and *it* and `code`"), "<strong>bold</strong> and <em>it</em> and <code>code</code>");
});

test("inline escapes HTML so copy can't inject markup", () => {
  assert.equal(inline("<script>alert(1)</script> & co"), "&lt;script&gt;alert(1)&lt;/script&gt; &amp; co");
});

test("inline leaves Markdown inside code untouched", () => {
  assert.equal(inline("`**not bold**`"), "<code>**not bold**</code>");
});

test("inline renders safe links in a new tab", () => {
  assert.equal(
    inline("[docs](https://example.com/a)"),
    '<a href="https://example.com/a" target="_blank" rel="noopener">docs</a>'
  );
});

test("inline neutralizes javascript: links", () => {
  assert.match(inline("[x](javascript:alert(1))"), /href="#"/);
});

test("render splits paragraphs on blank lines and joins wrapped lines", () => {
  assert.equal(render("one\ntwo\n\nthree").html, "<p>one two</p>\n<p>three</p>");
});

test("render builds bulleted lists, including wrapped items", () => {
  assert.equal(render("- first\n  continued\n- second").html, "<ul><li>first continued</li><li>second</li></ul>");
});

test("render builds numbered lists", () => {
  assert.equal(render("1. one\n2. two").html, "<ol><li>one</li><li>two</li></ol>");
});

test("render pulls verify notes out of the text", () => {
  const out = render("Claim.\n\n[[verify: check\n  this claim]]");
  assert.equal(out.html, "<p>Claim.</p>");
  assert.deepEqual(out.notes, ["check this claim"]);
});

test("render of empty input is empty", () => {
  assert.deepEqual(render(""), { html: "", notes: [] });
});

test("parseChapter reads the title and sections by lower-cased heading", () => {
  const ch = parseChapter("# Title\n\n## Story\n\nBody.\n\n## Under the hood\n\n- detail\n");
  assert.equal(ch.title, "Title");
  assert.deepEqual(Object.keys(ch.sections), ["story", "under the hood"]);
  assert.equal(ch.sections.story, "Body.");
});

test("parseChapter tolerates a heading with no body", () => {
  const ch = parseChapter("# T\n\n## Takeaway");
  assert.equal(ch.sections.takeaway, "");
});

test("parseChapter returns an empty title when there is none", () => {
  assert.equal(parseChapter("## Story\n\nx").title, "");
});
