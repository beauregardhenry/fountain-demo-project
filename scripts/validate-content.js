#!/usr/bin/env node
// Checks that the tour's content is well-formed before it reaches a pitch:
// content/tour.json lists chapters that exist, every chapter file has the
// headings the tour reads, and every recording is valid and plays in order.
// This is the tour's counterpart to verifying a built app bundle.
//
//   node scripts/validate-content.js            check the repository
//   node scripts/validate-content.js <root>     check another directory

"use strict";

const fs = require("fs");
const path = require("path");
const { parseChapter } = require("../markdown.js");

const EVENT_KINDS = new Set(["prompt", "status", "command", "output", "file", "message", "note"]);
const MACHINE_STATES = new Set(["idle", "waking", "working", "parked"]);
const REQUIRED_SECTIONS = ["story", "takeaway"];

function readJson(file, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(`${file}: ${err.code === "ENOENT" ? "file not found" : "invalid JSON (" + err.message + ")"}`);
    return null;
  }
}

function validateChapterFile(root, chapter, errors) {
  const file = path.join(root, chapter.file);
  if (!fs.existsSync(file)) {
    errors.push(`${chapter.file}: file not found (listed for chapter "${chapter.id}")`);
    return;
  }
  const parsed = parseChapter(fs.readFileSync(file, "utf8"));
  if (!parsed.title) errors.push(`${chapter.file}: missing a "# Title" line`);
  for (const name of REQUIRED_SECTIONS) {
    if (!parsed.sections[name]) {
      errors.push(`${chapter.file}: missing or empty "## ${name[0].toUpperCase() + name.slice(1)}" section`);
    }
  }
  const unknown = Object.keys(parsed.sections).filter(
    (name) => !REQUIRED_SECTIONS.includes(name) && name !== "under the hood"
  );
  for (const name of unknown) {
    errors.push(`${chapter.file}: unknown section "## ${name}" (the tour won't show it)`);
  }
}

function validateRecording(root, chapter, errors) {
  const file = path.join(root, chapter.recording);
  const rec = readJson(file, errors);
  if (!rec) return;
  const where = chapter.recording;
  if (!Array.isArray(rec.events) || rec.events.length === 0) {
    errors.push(`${where}: "events" must be a non-empty list`);
    return;
  }
  let previous = -1;
  rec.events.forEach((ev, i) => {
    const at = `${where}: event ${i + 1}`;
    if (typeof ev.at !== "number" || ev.at < 0) errors.push(`${at}: "at" must be a non-negative number of milliseconds`);
    else if (ev.at < previous) errors.push(`${at}: "at" (${ev.at}) is earlier than the event before it (${previous})`);
    else previous = ev.at;
    if (!EVENT_KINDS.has(ev.kind)) errors.push(`${at}: unknown kind "${ev.kind}"`);
    if (typeof ev.data !== "string" || !ev.data) errors.push(`${at}: "data" must be non-empty text`);
    if (ev.state !== undefined && !MACHINE_STATES.has(ev.state)) errors.push(`${at}: unknown state "${ev.state}"`);
  });
}

function validate(root) {
  const errors = [];
  const tour = readJson(path.join(root, "content/tour.json"), errors);
  if (!tour) return errors;
  if (typeof tour.draft !== "boolean") errors.push('content/tour.json: "draft" must be true or false');
  if (!Array.isArray(tour.chapters) || tour.chapters.length === 0) {
    errors.push('content/tour.json: "chapters" must be a non-empty list');
    return errors;
  }
  const seen = new Set();
  for (const chapter of tour.chapters) {
    if (!chapter.id || !/^[a-z0-9-]+$/.test(chapter.id)) {
      errors.push(`content/tour.json: chapter id "${chapter.id}" must be lowercase letters, digits and hyphens`);
    } else if (seen.has(chapter.id)) {
      errors.push(`content/tour.json: chapter id "${chapter.id}" is used twice`);
    }
    seen.add(chapter.id);
    if (!chapter.file) errors.push(`content/tour.json: chapter "${chapter.id}" has no "file"`);
    else validateChapterFile(root, chapter, errors);
    if (chapter.recording) validateRecording(root, chapter, errors);
  }
  return errors;
}

module.exports = { validate };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  const errors = validate(root);
  if (errors.length) {
    console.error(`Content check failed: ${errors.length} problem(s).`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log("Content check passed: every chapter and recording is well-formed.");
}
