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
- **Pin one Fountain version.** The machine-ownership work (ADR 0058) landed
  across v0.20–v0.21, and v0.18 retired the OpenAI-compatible endpoint, so the
  surface is still moving.
- **Don't depend on live app previews.** Port listing/access is still an open
  proposal ([managoat/fountain#2542](https://github.com/managoat/fountain/issues/2542)).
- **Replay mode is not optional.** Every chapter must run from a recording.
- **No real secrets or customer data in this public repo.** Chapter 3 uses
  test-mode credentials only.

## Chapters in detail

### 1. A real computer
- Show: one prompt → a machine wakes with a repo already cloned → stream the
  agent's work (files changing, commands running) as it happens.
- Teach: "This isn't a chatbot answering from memory; it's an agent with a
  computer."
- Under the hood: the single API call and the SSE event stream.

### 2. The Parking Lot
- Show: a board of many conversations; most are parked (asleep, holding
  their files at no compute cost), a few are working and their meters tick.
  Send a follow-up to a parked one and it resumes on the same disk.
- Teach: "You pay while it works, not while it waits." That's the business
  model.
- Depends on: open question Q1 (cost data).

### 3. Sealed Secrets
- Show: an agent with a test GitHub or Stripe credential reads a planted
  malicious file telling it to send its keys elsewhere. The agent's environment
  holds only a placeholder; the broker blocks the unknown destination; the
  legitimate API call still succeeds.
- Teach: "The agent never holds the key, so it can't leak it."
- Depends on: open question Q2 (broker rules via API).

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
- Day 1: create the sample repo and start the Overnight Engineer routine (ch. 4).
- Get answers to the open questions from engineering.
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
