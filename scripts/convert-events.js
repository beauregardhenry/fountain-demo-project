// Converts Fountain conversation events into the tour's recording format.
//
// Input: the `data` events from GET /api/conversations/{id}/events, requested with
// blocks=true and prompts=true (see Fountain's docs/api.md). Each event is a LogEvent:
// { id, ts, kind: "output" | "stage", stage, state, stream, data, turn_id, blocks: [...] }.
// Blocks are Fountain's own parse of the agent's output: prompt, text, thinking, tool_use,
// tool_result, error, plan, and a few bookkeeping kinds this tour doesn't show.
//
// Output: { events: [{ at, kind, state?, data }] } as content/tour.json's recordings expect.
//
// The tour plays a recording in seconds, not in real time, so time is compressed: the gap
// between two events is clamped between MIN_GAP_MS and MAX_GAP_MS, and a real gap longer
// than LONG_PAUSE_MS gets a note saying how much time actually passed. Nothing is invented:
// every line in the output comes from an event, or from the timestamps between them.

"use strict";

const MIN_GAP_MS = 350;
const MAX_GAP_MS = 1400;
const LONG_PAUSE_MS = 10 * 60 * 1000;
const MAX_TEXT = 220;

// Stage events that mean a machine is being started or woken before a turn.
const WAKE_STAGES = new Set(["reattach", "provision", "setup", "wake", "resume"]);

function clip(text, max = MAX_TEXT) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + "…" : flat;
}

function firstLines(text, lines = 3) {
  return String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, lines).join("  ");
}

function describeDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} minutes pass`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} pass${hours === 1 ? "es" : ""}`;
  return `${Math.round(hours / 24)} days pass`;
}

// A stage event becomes a machine-status line, or nothing.
function fromStage(ev) {
  const stage = String(ev.stage || "");
  // Fountain's docs write turn stages both as stage "turn" with a state, and as "turn/started".
  const [name, inlineState] = stage.split("/");
  const state = ev.state || inlineState;
  if (name === "turn") {
    if (state === "started") return { kind: "status", state: "working", data: "Agent started working" };
    if (state === "done") return { kind: "status", state: "idle", data: "Turn finished; machine waiting for the next message" };
    if (state === "failed") return { kind: "status", state: "idle", data: "Turn failed" };
    if (state === "interrupted") return { kind: "status", state: "idle", data: "Turn interrupted" };
    return null;
  }
  if (WAKE_STAGES.has(name) && state === "started") {
    const what = name === "provision" ? "Starting a new machine" : name === "setup" ? "Setting up the machine" : "Waking the machine";
    return { kind: "status", state: "waking", data: what };
  }
  if (WAKE_STAGES.has(name) && state === "failed") return { kind: "note", data: `Machine ${name} failed` };
  return null;
}

// A block becomes one line in the replay, or nothing.
function fromBlock(block) {
  const body = typeof block.body === "string" ? block.body : "";
  switch (block.kind) {
    case "prompt":
      return body ? { kind: "prompt", data: clip(body) } : null;
    case "text":
      return body.trim() ? { kind: "message", data: clip(body) } : null;
    case "tool_use": {
      const what = block.summary || [block.name, block.raw].filter(Boolean).join(" ");
      return what ? { kind: "command", data: clip(what, 140) } : null;
    }
    case "tool_result": {
      const what = block.summary || firstLines(body || block.raw);
      if (!what) return null;
      return { kind: "output", data: clip((block.error ? "Error: " : "") + what, 160) };
    }
    case "error":
      return { kind: "note", data: clip("Error: " + (block.summary || body || block.raw || "unknown")) };
    case "plan":
      if (!Array.isArray(block.body) || !block.body.length) return null;
      return { kind: "note", data: clip("Plan: " + block.body.map((s) => s.content).join("; ")) };
    default:
      // thinking, init, result, raw and permission_request aren't shown in the tour.
      return null;
  }
}

function convert(events, options = {}) {
  const sorted = [...events].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts) || a.id - b.id);
  const out = [];
  let clock = 0;
  let lastTs = null;

  function push(item, ts) {
    if (lastTs !== null) {
      const gap = ts - lastTs;
      if (gap >= LONG_PAUSE_MS) {
        clock += MAX_GAP_MS;
        out.push({ at: clock, kind: "note", data: describeDuration(gap) });
      }
      clock += Math.min(MAX_GAP_MS, Math.max(MIN_GAP_MS, gap));
    }
    lastTs = ts;
    out.push({ at: clock, ...item });
  }

  for (const ev of sorted) {
    const ts = Date.parse(ev.ts);
    if (Number.isNaN(ts)) continue;
    if (ev.kind === "stage") {
      const item = fromStage(ev);
      if (item) push(item, ts);
      continue;
    }
    for (const block of ev.blocks || []) {
      const item = fromBlock(block);
      if (item) push(item, ts);
    }
  }

  // Drop a status line that repeats the one before it (a wake followed by a second wake).
  const deduped = out.filter((e, i) => {
    const prev = out[i - 1];
    return !(prev && e.kind === "status" && prev.kind === "status" && prev.state === e.state && prev.data === e.data);
  });

  const recording = { placeholder: false, title: options.title || "", events: deduped };
  if (options.recordedAt) recording.recorded_at = options.recordedAt;
  return recording;
}

module.exports = { convert, fromBlock, fromStage, clip, describeDuration };
