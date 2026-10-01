"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { main, parseArgs, eventsFromSaved, fetchEvents, readCredentials, resolveCredentials } = require("../../scripts/record-conversation.js");

const SAMPLE = path.join(__dirname, "../fixtures/fountain-events.json");
const tmpOut = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rec-")), "out.json");
// An empty home directory, so tests never read the real ~/.fountain/credentials.
const emptyHome = () => fs.mkdtempSync(path.join(os.tmpdir(), "home-"));
const quiet = { log: () => {}, home: emptyHome() };

// A home directory holding a CLI credentials file with the given contents.
function homeWithCredentials(ini) {
  const home = emptyHome();
  fs.mkdirSync(path.join(home, ".fountain"));
  fs.writeFileSync(path.join(home, ".fountain", "credentials"), ini);
  return home;
}

// A stand-in for fetch that serves the given pages in order and records each URL it was asked for.
function fakeFetch(pages, status = 200) {
  const urls = [];
  const fn = async (url, init) => {
    urls.push({ url: String(url), auth: init.headers.Authorization });
    const body = pages[urls.length - 1];
    return { ok: status === 200, status, json: async () => body, text: async () => "nope" };
  };
  fn.urls = urls;
  return fn;
}

test("parseArgs reads flag/value pairs", () => {
  assert.deepEqual(parseArgs(["--out", "a.json", "--title", "T"]), { out: "a.json", title: "T" });
});

test("parseArgs rejects stray words and flags without values", () => {
  assert.throws(() => parseArgs(["oops"]), /Unexpected argument/);
  assert.throws(() => parseArgs(["--out"]), /needs a value/);
  assert.throws(() => parseArgs(["--out", "--title"]), /needs a value/);
});

test("saved files can be one response, a list of responses, or a list of events", () => {
  const ev = { id: 1 };
  assert.deepEqual(eventsFromSaved({ data: [ev] }), [ev]);
  assert.deepEqual(eventsFromSaved([{ data: [ev] }, { data: [ev] }]), [ev, ev]);
  assert.deepEqual(eventsFromSaved([ev]), [ev]);
  assert.throws(() => eventsFromSaved({ nope: true }), /doesn't look like/);
});

test("converting a saved file writes a recording", async () => {
  const out = tmpOut();
  const rec = await main(["--from-file", SAMPLE, "--out", out, "--title", "Sample"], {}, quiet);
  const written = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.deepEqual(written, rec);
  assert.equal(written.title, "Sample");
  assert.equal(written.placeholder, false);
});

test("--out and exactly one source are required", async () => {
  await assert.rejects(main(["--from-file", SAMPLE], {}, quiet), /--out is required/);
  await assert.rejects(main(["--out", tmpOut()], {}, quiet), /exactly one/);
  await assert.rejects(main(["--out", tmpOut(), "--from-file", SAMPLE, "--conversation", "c"], {}, quiet), /exactly one/);
});

test("fetching without any Fountain credentials says how to get them", async () => {
  await assert.rejects(main(["--conversation", "c", "--out", tmpOut()], {}, quiet), /run `fountain auth login`/);
});

test("credentials come from the CLI's saved profile", () => {
  const home = homeWithCredentials('[default]\napi_key = "ftn_saved"\nbase_url = "https://managoat.com"\n\n[staging]\napi_key = "ftn_staging"\n');
  assert.deepEqual(resolveCredentials({}, home), { apiKey: "ftn_saved", baseUrl: "https://managoat.com" });
  assert.equal(resolveCredentials({ FOUNTAIN_PROFILE: "staging" }, home).apiKey, "ftn_staging");
});

test("environment variables win over the saved profile, as in the CLI", () => {
  const home = homeWithCredentials('[default]\napi_key = "ftn_saved"\nbase_url = "https://managoat.com"\n');
  const env = { FOUNTAIN_API_KEY: "ftn_env", FOUNTAIN_BASE_URL: "https://other.example" };
  assert.deepEqual(resolveCredentials(env, home), { apiKey: "ftn_env", baseUrl: "https://other.example" });
  assert.equal(resolveCredentials({ FOUNTAIN_URL: "https://old.example" }, home).baseUrl, "https://old.example");
});

test("a missing credentials file reads as no saved profile", () => {
  assert.deepEqual(readCredentials(path.join(emptyHome(), "nope"), "default"), {});
});

test("a conversation with nothing showable is refused rather than written empty", async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rec-")), "empty.json");
  fs.writeFileSync(file, JSON.stringify({ data: [{ id: 1, ts: "2026-10-01T09:00:00Z", kind: "output", data: "x" }] }));
  await assert.rejects(main(["--from-file", file, "--out", tmpOut()], {}, quiet), /No showable events/);
});

test("fetchEvents pages forward with the cursor until there are no more", async () => {
  const fetch = fakeFetch([
    { data: [{ id: 1 }], meta: { has_more: true, next_cursor: 1, limit: 500 } },
    { data: [{ id: 2 }], meta: { has_more: false, next_cursor: null, limit: 500 } },
  ]);
  const events = await fetchEvents("https://fountain.example", "key-123", "conv/1", fetch);
  assert.deepEqual(events, [{ id: 1 }, { id: 2 }]);
  assert.equal(fetch.urls.length, 2);
  assert.match(fetch.urls[0].url, /\/api\/conversations\/conv%2F1\/events\?order=asc&blocks=true&prompts=true&limit=500$/);
  assert.match(fetch.urls[1].url, /&after=1$/);
  assert.equal(fetch.urls[0].auth, "Bearer key-123");
});

test("fetchEvents reports an error response", async () => {
  await assert.rejects(fetchEvents("https://fountain.example", "k", "c", fakeFetch([], 401)), /Fountain answered 401/);
});

test("fetching through main writes the recording", async () => {
  const sample = JSON.parse(fs.readFileSync(SAMPLE, "utf8"));
  const out = tmpOut();
  const fetch = fakeFetch([{ data: sample.data, meta: { has_more: false, limit: 500 } }]);
  const env = { FOUNTAIN_BASE_URL: "https://fountain.example", FOUNTAIN_API_KEY: "k" };
  const rec = await main(["--conversation", "c", "--out", out], env, { log: () => {}, fetch, home: emptyHome() });
  assert.ok(rec.events.length > 5);
  assert.ok(fs.existsSync(out));
});
