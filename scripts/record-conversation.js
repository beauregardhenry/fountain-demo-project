#!/usr/bin/env node
// Turns a real Fountain conversation into a tour recording.
//
// Fetch it straight from Fountain (needs network access to your Fountain instance). It uses
// the same credentials as the `fountain` CLI: FOUNTAIN_API_KEY and FOUNTAIN_BASE_URL from the
// environment, or else what `fountain auth login` saved in ~/.fountain/credentials.
//   node scripts/record-conversation.js --conversation <id> \
//       --out recordings/01-a-real-computer.json --title "One message, one computer"
//
// Or convert a response someone saved elsewhere (no network needed):
//   curl -H "Authorization: Bearer $FOUNTAIN_API_KEY" \
//     "$FOUNTAIN_BASE_URL/api/conversations/<id>/events?order=asc&blocks=true&prompts=true&limit=500" \
//     > events.json
//   node scripts/record-conversation.js --from-file events.json --out recordings/… --title "…"
//
// Saved pages can be one response ({ data: [...] }), a list of responses, or a bare list of
// events. The API key is read from the environment only, never from a flag, so it never lands
// in shell history. This repository is public: read every line of the result before committing.

"use strict";

const fs = require("fs");
const os = require("os");
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

// Reads one profile from the CLI's INI-style credentials file: [profile] then key = "value".
function readCredentials(file, profile) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  let section = null;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    const header = line.match(/^\[(.+)\]$/);
    if (header) { section = header[1].trim(); continue; }
    const pair = line.match(/^([A-Za-z_]+)\s*=\s*"?(.*?)"?$/);
    if (pair && section === profile) out[pair[1]] = pair[2];
  }
  return out;
}

// Resolves the key and URL in the CLI's order: the environment first, then the saved profile.
// FOUNTAIN_URL is accepted as an older spelling of FOUNTAIN_BASE_URL.
function resolveCredentials(env, home = os.homedir()) {
  const saved = readCredentials(path.join(home, ".fountain", "credentials"), env.FOUNTAIN_PROFILE || "default");
  return {
    apiKey: env.FOUNTAIN_API_KEY || saved.api_key,
    baseUrl: env.FOUNTAIN_BASE_URL || env.FOUNTAIN_URL || saved.base_url,
  };
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
    const { apiKey, baseUrl } = resolveCredentials(env, io.home);
    if (!apiKey || !baseUrl) {
      throw new Error("No Fountain credentials: run `fountain auth login`, or set FOUNTAIN_API_KEY and FOUNTAIN_BASE_URL");
    }
    events = await fetchEvents(baseUrl, apiKey, args.conversation, io.fetch);
  }

  const recording = convert(events, { title: args.title, recordedAt: new Date().toISOString().slice(0, 10) });
  if (!recording.events.length) throw new Error(`No showable events among the ${events.length} read; were they requested with blocks=true?`);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(recording, null, 2) + "\n");
  io.log(`Wrote ${recording.events.length} lines from ${events.length} events to ${args.out}.`);
  io.log("This repository is public: read the recording before committing, and remove anything private.");
  return recording;
}

module.exports = { main, parseArgs, eventsFromSaved, fetchEvents, readCredentials, resolveCredentials };

if (require.main === module) {
  main(process.argv.slice(2), process.env).catch((err) => {
    console.error(`Recording failed: ${err.message}`);
    process.exit(1);
  });
}
