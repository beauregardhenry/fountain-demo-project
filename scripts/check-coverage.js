#!/usr/bin/env node
// Test coverage only ratchets one way. This runs the unit tests with Node's built-in coverage,
// measures line coverage over the source files they load, and fails when it slips below the
// number in coverage-baseline.txt, so a change that adds untested code has to say so out loud
// instead of quietly diluting the suite.
//
// app.js is excluded on purpose: it is the page's DOM wiring and is exercised by the browser
// tests, which run in a separate job and never reach this profile. Counting it here would swamp
// the signal from markdown.js and scripts/ with code this suite cannot touch. tests/ is excluded
// because tests covering themselves says nothing.
//
// Do NOT bump coverage-baseline.txt from a feature branch. The coverage-ratchet workflow
// re-measures on every push to main and commits the raised number itself.
//
//   node scripts/check-coverage.js                    measure and enforce (what a PR runs)
//   node scripts/check-coverage.js --update-if-higher raise the floor only if coverage climbed past
//                                                     the slack; never lowers. What main runs.
//   node scripts/check-coverage.js --update           rewrite unconditionally. For deliberately
//                                                     lowering it, with a reason in the commit.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const BASELINE_FILE = path.join(ROOT, "coverage-baseline.txt");
const IGNORE = /^(tests\/|node_modules\/|app\.js$)/;
// How far coverage may drift below the baseline before the build fails. Small enough to catch a
// deleted test, loose enough to absorb rounding when unrelated lines move around.
const TOLERANCE = Number(process.env.COVERAGE_TOLERANCE || 0.25);
// How far above the baseline coverage has to climb before the ratchet raises it.
const RATCHET_SLACK = Number(process.env.COVERAGE_RATCHET_SLACK || 0.5);
const HEADER = `# Line-coverage floor for the source files the unit tests load (app.js and tests/ excluded).
# Raised automatically by .github/workflows/coverage-ratchet.yml on every push to main; don't bump
# it from a feature branch (see the header of scripts/check-coverage.js). Lower it only
# deliberately, with a reason in the commit.`;

const mode = { "--update": "update", "--update-if-higher": "update-if-higher", undefined: "check" }[process.argv[2]];
if (!mode) {
  console.error("Usage: check-coverage.js [--update|--update-if-higher]");
  process.exit(2);
}

console.log("Running the unit tests with a fresh coverage profile.");
const lcovFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "coverage-")), "lcov.info");
const run = spawnSync(process.execPath, [
  "--test", "--experimental-test-coverage",
  "--test-reporter=spec", "--test-reporter-destination=stdout",
  "--test-reporter=lcov", `--test-reporter-destination=${lcovFile}`,
  "tests/unit/*.test.js",
], { cwd: ROOT, stdio: "inherit" });
if (run.status !== 0) {
  console.error("Coverage check failed: the unit tests did not pass.");
  process.exit(1);
}
if (!fs.existsSync(lcovFile)) {
  console.error(`Coverage check failed: ${lcovFile} was not produced.`);
  process.exit(1);
}

// lcov records: SF:<file>, LF:<lines found>, LH:<lines hit>, end_of_record.
const files = [];
let current = null;
for (const line of fs.readFileSync(lcovFile, "utf8").split("\n")) {
  if (line.startsWith("SF:")) current = { file: path.relative(ROOT, path.resolve(ROOT, line.slice(3))), found: 0, hit: 0 };
  else if (line.startsWith("LF:") && current) current.found = Number(line.slice(3));
  else if (line.startsWith("LH:") && current) current.hit = Number(line.slice(3));
  else if (line === "end_of_record" && current) {
    if (!IGNORE.test(current.file.split(path.sep).join("/"))) files.push(current);
    current = null;
  }
}
const found = files.reduce((n, f) => n + f.found, 0);
const hit = files.reduce((n, f) => n + f.hit, 0);
if (!found) {
  console.error("Coverage check failed: no source lines were measured.");
  process.exit(1);
}
const percent = Number(((hit / found) * 100).toFixed(2));

console.log(`\nLine coverage (sources the unit tests load, app.js excluded): ${percent}% (${hit}/${found} lines)`);
console.log("Least-covered files:");
files
  .map((f) => ({ ...f, pct: (f.hit / f.found) * 100 }))
  .sort((a, b) => a.pct - b.pct)
  .slice(0, 5)
  .forEach((f) => console.log(`  ${f.pct.toFixed(1).padStart(5)}%  ${String(f.found).padStart(5)} lines  ${f.file}`));

const writeBaseline = (value) => fs.writeFileSync(BASELINE_FILE, `${HEADER}\nlines=${value.toFixed(2)}\n`);

if (mode === "update") {
  writeBaseline(percent);
  console.log(`Baseline updated to ${percent}%. Commit coverage-baseline.txt.`);
  process.exit(0);
}

const match = fs.existsSync(BASELINE_FILE) && fs.readFileSync(BASELINE_FILE, "utf8").match(/^lines=([0-9]+(?:\.[0-9]+)?)\s*$/m);
if (!match) {
  if (mode === "update-if-higher") {
    writeBaseline(percent);
    console.log(`No baseline recorded yet; seeded it at ${percent}%.`);
  } else {
    console.log("\nNo coverage baseline recorded yet, so nothing to enforce.");
    console.log("This is normally seeded by the post-merge coverage-ratchet workflow, not by hand.");
  }
  process.exit(0);
}

const baseline = Number(match[1]);
const floor = Math.max(0, baseline - TOLERANCE);
const verdict = percent < floor ? "below" : percent > baseline + RATCHET_SLACK ? "above" : "held";
console.log();

if (mode === "update-if-higher") {
  // Runs post-merge on main, never in a PR: only ever raises the floor. A regression here means
  // something merged despite the PR-time check failing or being skipped, so it fails loudly.
  if (verdict === "below") {
    console.error(`Coverage check failed: ${percent}% is below the ${baseline}% baseline (floor ${floor.toFixed(2)}%) on main.`);
    console.error("The baseline was left untouched; investigate how a regression reached main.");
    process.exit(1);
  }
  if (verdict === "above") {
    writeBaseline(percent);
    console.log(`Baseline raised from ${baseline}% to ${percent}%. Committing coverage-baseline.txt.`);
  } else {
    console.log(`Coverage holds at ${percent}% against the ${baseline}% baseline; nothing to update.`);
  }
  process.exit(0);
}

if (verdict === "below") {
  console.error(`Coverage check failed: ${percent}% is below the ${baseline}% baseline (floor ${floor.toFixed(2)}%).`);
  console.error("Add tests for the new code, or lower coverage-baseline.txt deliberately and say why in the commit.");
  process.exit(1);
}
if (verdict === "above") {
  console.log(`Coverage rose to ${percent}% from the ${baseline}% baseline.`);
  console.log("No action needed: the post-merge coverage-ratchet workflow raises the baseline on main automatically.");
} else {
  console.log(`Coverage holds at ${percent}% against the ${baseline}% baseline.`);
}
