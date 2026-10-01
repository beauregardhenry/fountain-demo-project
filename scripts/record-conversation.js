#!/usr/bin/env node
// Turns a real Fountain conversation into a tour recording.
//
// Fetch it straight from Fountain (needs network access to your Fountain instance):
//   FOUNTAIN_URL=https://… FOUNTAIN_API_KEY=… \
//     node scripts/record-conversation.js --conversation <id> \
//       --out recordings/01-a-real-computer.json --title "One message, one computer"
//
// Or convert a response someone saved elsewhere (no network needed):
//   curl -H "Authorization: Bearer $FOUNTAIN_API_KEY" \
//     "$FOUNTAIN_URL/api/conversations/<id>/events?order=asc&blocks=true&prompts=true&limit=500" \
//     > events.json
//   node scripts/record-conversation.js --from-file events.json --out recordings/… --title "…"
//
// Saved pages can be one response ({ data: [...] }), a list of responses, or a bare list of
// events. The API key is read from the environment only, never from a flag, so it never lands
// in shell history. This repository is public: read every line of the result before committing.

"use strict";

const fs = require("fs");
const path = require("path");
const { convert } = require("./convert-events.js");

const PAGE_LIMIT = 500;
const MAX_PAGES = 200;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument: ${flag}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value`);
    args[flag.slice(2)] = value;
    i++;
  }
  return args;
}

// Accepts { data }, [{ data }, …] or [event, …].
function eventsFromSaved(json) {
  if (Array.isArray(json)) return json.flatMap((x) => (x && Array.isArray(x.data) ? x.data : [x]));
  if (json && Array.isArray(json.data)) return json.data;
  throw new Error("The file doesn't look like a Fountain events response (expected a \"data\" list).");
}

async function fetchEvents(baseUrl, apiKey, conversationId, fetchImpl = fetch) {
  const events = [];
  let after = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`/api/conversations/${encodeURIComponent(conversationId)}/events`, baseUrl);
    url.search = new URLSearchParams({ order: "asc", blocks: "true", prompts: "true", limit: String(PAGE_LIMIT) }).toString();
    if (after !== null) url.searchParams.set("after", String(after));
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Fountain answered ${res.status} for ${url.pathname}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    events.push(...json.data);
    if (!json.meta || !json.meta.has_more || json.meta.next_cursor == null) return events;
    after = json.meta.next_cursor;
  }
  throw new Error(`Stopped after ${MAX_PAGES} pages; is the conversation unusually long?`);
}

async function main(argv, env, io = { log: console.log }) {
  const args = parseArgs(argv);
  if (!args.out) throw new Error("--out is required (for example recordings/01-a-real-computer.json)");
  if (!args.conversation === !args["from-file"]) throw new Error("Give exactly one of --conversation or --from-file");

  let events;
  if (args["from-file"]) {
    events = eventsFromSaved(JSON.parse(fs.readFileSync(args["from-file"], "utf8")));
  } else {
    if (!env.FOUNTAIN_URL || !env.FOUNTAIN_API_KEY) throw new Error("Set FOUNTAIN_URL and FOUNTAIN_API_KEY in the environment");
    events = await fetchEvents(env.FOUNTAIN_URL, env.FOUNTAIN_API_KEY, args.conversation, io.fetch);
  }

  const recording = convert(events, { title: args.title, recordedAt: new Date().toISOString().slice(0, 10) });
  if (!recording.events.length) throw new Error(`No showable events among the ${events.length} read; were they requested with blocks=true?`);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(recording, null, 2) + "\n");
  io.log(`Wrote ${recording.events.length} lines from ${events.length} events to ${args.out}.`);
  io.log("This repository is public: read the recording before committing, and remove anything private.");
  return recording;
}

module.exports = { main, parseArgs, eventsFromSaved, fetchEvents };

if (require.main === module) {
  main(process.argv.slice(2), process.env).catch((err) => {
    console.error(`Recording failed: ${err.message}`);
    process.exit(1);
  });
}
