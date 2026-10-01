#!/usr/bin/env node
// Test count only ratchets one way, the same shape as check-coverage.js: fails when either
// suite's test count drops below the number recorded in test-count-baseline.txt. Coverage mostly
// catches a deleted test too, but a raw count is a more direct signal: a test quietly commented
// out, skipped, or deleted during a merge conflict shows up here even when coverage barely moves.
//
// Counting is static: it counts `test(` calls at the start of a line in each suite's files, not
// an actual test run. That keeps this check fast and dependency-free (no browser, no server).
// Every test in this repository is a top-level `test("...", ...)` call, so the counts match what
// the runners report.
//
// Do NOT bump test-count-baseline.txt from a feature branch. The test-count-ratchet workflow
// re-measures on every push to main and commits the raised numbers itself, so two PRs in flight
// never both edit the same line.
//
//   node scripts/check-test-count.js                    measure and enforce (what a PR runs)
//   node scripts/check-test-count.js --update-if-higher raise a suite's floor only if it climbed;
//                                                       never lowers. What the workflow on main runs.
//   node scripts/check-test-count.js --update           rewrite unconditionally. For deliberately
//                                                       lowering it, with a reason in the commit.

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BASELINE_FILE = path.join(ROOT, "test-count-baseline.txt");
const SUITES = [
  { key: "unit", label: "Unit", dir: "tests/unit", suffix: ".test.js" },
  { key: "browser", label: "Browser", dir: "tests/browser", suffix: ".spec.js" },
];
const HEADER = `# Test-count floors for the unit and browser test suites. Raised automatically by
# .github/workflows/test-count-ratchet.yml on every push to main; don't bump it from a feature
# branch (see the header of scripts/check-test-count.js). Lower one only deliberately, with a
# reason in the commit.`;

function countTests(dir, suffix) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return 0;
  return fs.readdirSync(full)
    .filter((f) => f.endsWith(suffix))
    .reduce((n, f) => n + (fs.readFileSync(path.join(full, f), "utf8").match(/^\s*test\(/gm) || []).length, 0);
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return {};
  const out = {};
  for (const line of fs.readFileSync(BASELINE_FILE, "utf8").split("\n")) {
    const m = line.match(/^(\w+)=(\d+)\s*$/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

function writeBaseline(values) {
  const body = SUITES.map((s) => `${s.key}=${values[s.key]}`).join("\n");
  fs.writeFileSync(BASELINE_FILE, `${HEADER}\n${body}\n`);
}

const mode = { "--update": "update", "--update-if-higher": "update-if-higher", undefined: "check" }[process.argv[2]];
if (!mode) {
  console.error("Usage: check-test-count.js [--update|--update-if-higher]");
  process.exit(2);
}

const counts = {};
for (const s of SUITES) {
  counts[s.key] = countTests(s.dir, s.suffix);
  console.log(`${s.label} test count: ${counts[s.key]}`);
}

if (mode === "update") {
  writeBaseline(counts);
  console.log(`Baseline updated to ${SUITES.map((s) => `${s.key}=${counts[s.key]}`).join(", ")}. Commit test-count-baseline.txt.`);
  process.exit(0);
}

const baseline = readBaseline();
if (SUITES.some((s) => baseline[s.key] === undefined)) {
  if (mode === "update-if-higher") {
    writeBaseline(counts);
    console.log("No baseline recorded yet; seeded it from the current counts.");
  } else {
    console.log("\nNo test-count baseline recorded yet, so nothing to enforce.");
    console.log("This is normally seeded by the post-merge test-count-ratchet workflow, not by hand.");
  }
  process.exit(0);
}

console.log();
let failed = false;
const raised = { ...baseline };
for (const s of SUITES) {
  const count = counts[s.key];
  const floor = baseline[s.key];
  if (count < floor) {
    console.error(`Test count check failed: ${s.label} count ${count} is below the ${floor} baseline.`);
    console.error("A test was removed, skipped or commented out.");
    console.error("Add tests back, or lower test-count-baseline.txt deliberately and say why in the commit.");
    failed = true;
  } else if (count > floor) {
    console.log(`${s.label} test count rose to ${count} from the ${floor} baseline.`);
    raised[s.key] = count;
  } else {
    console.log(`${s.label} test count holds at ${count}.`);
  }
}

if (mode === "update-if-higher") {
  // Runs post-merge on main, never in a PR: a drop here means something merged despite the
  // PR-time check failing or being skipped, so it's surfaced loudly rather than lowering a floor.
  if (SUITES.some((s) => raised[s.key] !== baseline[s.key])) {
    writeBaseline(raised);
    console.log("Baseline raised. Committing test-count-baseline.txt.");
  } else {
    console.log("Nothing to update.");
  }
} else if (!failed) {
  console.log("No action needed: the post-merge test-count-ratchet workflow raises the baseline automatically.");
}
process.exit(failed ? 1 : 0);
