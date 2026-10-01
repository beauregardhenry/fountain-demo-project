"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validate } = require("../../scripts/validate-content.js");

const GOOD_CHAPTER = "# Title\n\n## Story\n\nText.\n\n## Takeaway\n\nOne line.\n";
const GOOD_RECORDING = { events: [{ at: 0, kind: "prompt", data: "hi" }, { at: 10, kind: "status", state: "working", data: "go" }] };

// Builds a throwaway content tree; overrides replace files by relative path
// (null deletes one).
function fixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tour-"));
  const files = {
    "content/tour.json": {
      title: "T",
      draft: true,
      chapters: [{ id: "one", file: "content/chapters/one.md", recording: "recordings/one.json" }],
    },
    "content/chapters/one.md": GOOD_CHAPTER,
    "recordings/one.json": GOOD_RECORDING,
    ...overrides,
  };
  for (const [rel, body] of Object.entries(files)) {
    if (body === null) continue;
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof body === "string" ? body : JSON.stringify(body));
  }
  return root;
}

test("the repository's own content is valid", () => {
  assert.deepEqual(validate(path.join(__dirname, "../..")), []);
});

test("a well-formed fixture passes", () => {
  assert.deepEqual(validate(fixture()), []);
});

test("a missing tour.json is reported", () => {
  const errors = validate(fixture({ "content/tour.json": null }));
  assert.match(errors[0], /tour\.json: file not found/);
});

test("invalid JSON in tour.json is reported", () => {
  const errors = validate(fixture({ "content/tour.json": "{ nope" }));
  assert.match(errors[0], /invalid JSON/);
});

test("draft must be a boolean and chapters non-empty", () => {
  const errors = validate(fixture({ "content/tour.json": { draft: "yes", chapters: [] } }));
  assert.equal(errors.length, 2);
});

test("duplicate and malformed chapter ids are reported", () => {
  const chapter = { id: "one", file: "content/chapters/one.md" };
  const errors = validate(fixture({
    "content/tour.json": { draft: false, chapters: [chapter, chapter, { id: "Bad Id", file: "content/chapters/one.md" }] },
  }));
  assert.ok(errors.some((e) => /used twice/.test(e)));
  assert.ok(errors.some((e) => /"Bad Id" must be lowercase/.test(e)));
});

test("a chapter without a file, or with a missing file, is reported", () => {
  const errors = validate(fixture({
    "content/tour.json": { draft: false, chapters: [{ id: "a" }, { id: "b", file: "content/chapters/gone.md" }] },
  }));
  assert.ok(errors.some((e) => /"a" has no "file"/.test(e)));
  assert.ok(errors.some((e) => /gone\.md: file not found/.test(e)));
});

test("missing title, missing takeaway and unknown sections are reported", () => {
  const errors = validate(fixture({ "content/chapters/one.md": "## Story\n\nx\n\n## Takeways\n\ny\n" }));
  assert.ok(errors.some((e) => /missing a "# Title"/.test(e)));
  assert.ok(errors.some((e) => /"## Takeaway" section/.test(e)));
  assert.ok(errors.some((e) => /unknown section "## takeways"/.test(e)));
});

test("a recording with no events is reported", () => {
  const errors = validate(fixture({ "recordings/one.json": { events: [] } }));
  assert.match(errors[0], /non-empty list/);
});

test("out-of-order, unknown and empty recording events are reported", () => {
  const errors = validate(fixture({
    "recordings/one.json": {
      events: [
        { at: 50, kind: "prompt", data: "a" },
        { at: 10, kind: "prompt", data: "b" },
        { at: -1, kind: "shout", data: "" },
        { at: 60, kind: "status", state: "asleep", data: "c" },
      ],
    },
  }));
  assert.ok(errors.some((e) => /event 2: "at" \(10\) is earlier/.test(e)));
  assert.ok(errors.some((e) => /event 3: "at" must be/.test(e)));
  assert.ok(errors.some((e) => /event 3: unknown kind "shout"/.test(e)));
  assert.ok(errors.some((e) => /event 3: "data" must be/.test(e)));
  assert.ok(errors.some((e) => /event 4: unknown state "asleep"/.test(e)));
});

test("a missing recording file is reported", () => {
  const errors = validate(fixture({ "recordings/one.json": null }));
  assert.match(errors[0], /one\.json: file not found/);
});
