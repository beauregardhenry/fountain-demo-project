"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { convert, fromBlock, fromStage, clip, describeDuration } = require("../../scripts/convert-events.js");
const sample = require("../fixtures/fountain-events.json");

test("the sample conversation converts to the expected lines, in order", () => {
  const { events } = convert(sample.data);
  assert.deepEqual(events.map((e) => e.kind), [
    "status", "status", "prompt", "status", "command", "output", "note", "command", "output", "message", "status",
    "note", "status", "status",
  ]);
  assert.equal(events[0].data, "Starting a new machine");
  assert.equal(events[2].data, "The signup form accepts emails without an @. Fix it and add a test.");
  assert.equal(events[5].data, "src/forms/signup.ts:14: if (email.length > 0) { src/forms/signup.ts:15: return true;");
  assert.equal(events[6].data, "Plan: Fix the check; Add a test");
  assert.equal(events[10].state, "idle");
  assert.equal(events[11].data, "3 hours pass");
  assert.equal(events[13].state, "working");
});

test("converted recordings play in order and stay short", () => {
  const { events } = convert(sample.data);
  for (let i = 1; i < events.length; i++) assert.ok(events[i].at > events[i - 1].at, `event ${i} is not after the one before`);
  assert.ok(events[events.length - 1].at < 20000, "a short conversation should replay in under 20 seconds");
});

test("a recording from real events is not marked as a placeholder", () => {
  const rec = convert(sample.data, { title: "T", recordedAt: "2026-10-01" });
  assert.equal(rec.placeholder, false);
  assert.equal(rec.title, "T");
  assert.equal(rec.recorded_at, "2026-10-01");
});

test("events arriving out of order are sorted by time", () => {
  const a = { id: 1, ts: "2026-10-01T09:00:00Z", kind: "output", blocks: [{ kind: "prompt", body: "first" }] };
  const b = { id: 2, ts: "2026-10-01T09:00:05Z", kind: "output", blocks: [{ kind: "text", body: "second" }] };
  assert.deepEqual(convert([b, a]).events.map((e) => e.data), ["first", "second"]);
});

test("events with an unreadable timestamp are skipped", () => {
  const bad = { id: 1, ts: "not a date", kind: "output", blocks: [{ kind: "text", body: "lost" }] };
  assert.deepEqual(convert([bad]).events, []);
});

test("a repeated status line is dropped", () => {
  const wake = (id, stage) => ({ id, ts: `2026-10-01T09:00:0${id}Z`, kind: "stage", stage, state: "started" });
  const { events } = convert([wake(1, "reattach"), wake(2, "resume")]);
  assert.equal(events.length, 1);
});

test("turn stages map to working and idle, written either way", () => {
  assert.equal(fromStage({ stage: "turn", state: "started" }).state, "working");
  assert.equal(fromStage({ stage: "turn/done" }).state, "idle");
  assert.equal(fromStage({ stage: "turn", state: "failed" }).data, "Turn failed");
  assert.equal(fromStage({ stage: "turn", state: "interrupted" }).data, "Turn interrupted");
  assert.equal(fromStage({ stage: "turn", state: "weird" }), null);
});

test("machine stages map to waking, and failures to a note", () => {
  assert.equal(fromStage({ stage: "setup", state: "started" }).data, "Setting up the machine");
  assert.equal(fromStage({ stage: "reattach", state: "started" }).data, "Waking the machine");
  assert.equal(fromStage({ stage: "provision", state: "done" }), null);
  assert.equal(fromStage({ stage: "provision", state: "failed" }).kind, "note");
  assert.equal(fromStage({ stage: "something-else", state: "started" }), null);
  assert.equal(fromStage({}), null);
});

test("blocks the tour doesn't show are skipped", () => {
  for (const kind of ["thinking", "init", "result", "raw", "permission_request"]) {
    assert.equal(fromBlock({ kind, body: "x" }), null, kind);
  }
});

test("empty blocks are skipped", () => {
  assert.equal(fromBlock({ kind: "prompt", body: "" }), null);
  assert.equal(fromBlock({ kind: "text", body: "   " }), null);
  assert.equal(fromBlock({ kind: "tool_use" }), null);
  assert.equal(fromBlock({ kind: "tool_result" }), null);
  assert.equal(fromBlock({ kind: "plan", body: [] }), null);
});

test("tool calls fall back to name and raw input when there's no summary", () => {
  assert.deepEqual(fromBlock({ kind: "tool_use", name: "Read", raw: "src/app.ts" }), { kind: "command", data: "Read src/app.ts" });
});

test("failed tool results and errors are labeled", () => {
  assert.equal(fromBlock({ kind: "tool_result", error: true, summary: "exit 1" }).data, "Error: exit 1");
  assert.equal(fromBlock({ kind: "error", body: "rate limited" }).data, "Error: rate limited");
  assert.equal(fromBlock({ kind: "error" }).data, "Error: unknown");
});

test("long text is clipped with an ellipsis and whitespace is flattened", () => {
  assert.equal(clip("a\n\n b", 10), "a b");
  const long = clip("word ".repeat(100), 20);
  assert.equal(long.length, 20);
  assert.ok(long.endsWith("…"));
});

test("long pauses are described in minutes, hours or days", () => {
  assert.equal(describeDuration(12 * 60000), "12 minutes pass");
  assert.equal(describeDuration(60 * 60000), "1 hour passes");
  assert.equal(describeDuration(5 * 3600000), "5 hours pass");
  assert.equal(describeDuration(3 * 86400000), "3 days pass");
});
