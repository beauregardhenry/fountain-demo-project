# Build plan (two weeks)

## Audience

Mixed: VC partners with no technical background, technical angels, and
strategic investors. The two-layer format (story / under the hood) is what
lets one artifact serve all three.

## Ground rules

- **Build only on the public REST API or an official SDK**, the same as the
  apps in [managoat/demos](https://github.com/managoat/demos). The tour should
  prove that "an app which hires agents… is an ordinary web app with no
  privileged access."
- **Pin one Fountain version: v0.21.0** (the latest release). The
  machine-ownership work (ADR 0058) landed across v0.20–v0.21, and v0.18
  retired the OpenAI-compatible endpoint, so the surface is still moving.
- **Don't depend on live app previews.** Port listing/access is still an open
  proposal ([managoat/fountain#2542](https://github.com/managoat/fountain/issues/2542)).
- **Replay mode is not optional.** Every chapter must run from a recording.
- **No real secrets or customer data in this public repo.** Chapter 3 uses
  test-mode credentials only.
- **Record from history, not the live stream.** Recordings come from
  `GET /api/conversations/{id}/events` on a finished conversation (see Q6).

## Chapters in detail

### 1. A real computer
- Show: one prompt → a machine wakes with a repo already cloned → stream the
  agent's work (files changing, commands running) as it happens.
- Teach: "This isn't a chatbot answering from memory; it's an agent with a
  computer."
- Under the hood: the single API call and the SSE event stream.

### 2. The Parking Lot
- Show: a board of many conversations in three states: working, idle (machine
  still on, waiting for a reply) and parked (switched off, files kept). Send a
  follow-up to a parked one and it resumes on the same disk.
- Teach: "A conversation can wait for days without its computer running."
- Note: parking happens after an idle timeout, not the instant a turn ends,
  and parked machines cost "almost nothing", not zero. No dollar figures
  unless Q1 turns up a per-conversation number.

### 3. Sealed Secrets
- Show: an agent with a test `GITHUB_TOKEN` (built-in binding, no feature
  flag needed) reads a planted malicious file telling it to send its keys
  elsewhere. The agent's environment holds only a placeholder; with network
  policy `limited`, the broker refuses the unknown host with a 403; the
  legitimate GitHub call still succeeds. Close on the conversation's egress
  log as proof.
- Teach: "The agent never holds the key, so it can't leak it."

### 4. Overnight Engineer
- Show: a time-lapse of one agent working through issues in a sample repo
  across a week: wake, work, park, repeat, with its earlier work still on disk.
- Teach: "Agents that remember, like a colleague instead of a search box."
- **Must start on day 1**: the week of history has to accumulate in real time.

### 5. Build your own
- Show: a complete agent app in roughly 40 lines using an SDK, running.
- Teach: "Fountain is a platform; other companies build products on it."

## Schedule

**Week 1**
- Day 1: create the sample repo, add the Overnight Engineer as a teammate,
  and give it a daily schedule (ch. 4). Not `one_off`: every run must land on
  the same machine.
- Get answers to the remaining open questions (Q1, Q5, Q7, Q8).
- Build the tour shell, the two-layer chapter template, and replay mode.
- Build chapters 1 and 2.

**Week 2**
- Build chapters 3, 4 (from the week's recordings) and 5.
- Polish copy with a non-technical reader in mind; test it on someone who has
  never heard of Fountain.
- Write a presenter script and do a full rehearsal in replay mode.

## Out of scope (for now)

- Model comparison (already covered by the `arena` demo).
- Fleet fan-out at scale (already covered by `mission-control`). The tour can
  link to existing demos rather than rebuild them.
