# Recording real conversations

Each chapter's demo plays a recording in `recordings/`. Until a chapter's recording comes from a
real Fountain conversation, it's a placeholder, labeled on screen as illustrative. This guide
replaces the placeholders.

## How a recording is made

1. Run the conversation on Fountain (the scripts for each chapter are below).
2. Turn its history into a recording with `scripts/record-conversation.js`. It reads the
   conversation's events (`GET /api/conversations/{id}/events` with `blocks=true` and
   `prompts=true`), keeps what a viewer needs (your message, the commands the agent runs, what it
   sees, its reply, and the machine's status), and compresses the timing so the demo plays in
   seconds. A long real pause becomes a note such as "3 hours pass", worked out from the
   timestamps.
3. **Read the whole recording before committing it.** This repository is public. Fountain already
   replaces every secret it put into the machine with `[REDACTED]` before saving the transcript,
   but file contents, repository names and anything typed into the prompt are kept as they were.
4. Open a pull request. CI checks the recording's format and scans it for credential-shaped
   strings.

### Fetching directly

Needs network access to Fountain (`managoat.com` for the hosted platform) and the same
credentials as the `fountain` CLI. After `fountain auth login`, nothing else is needed; the
recorder reads the key and server the CLI saved. `FOUNTAIN_API_KEY` and `FOUNTAIN_BASE_URL` in the
environment take priority, as they do for the CLI.

```bash
fountain auth login
node scripts/record-conversation.js --conversation <conversation-id> \
  --out recordings/01-a-real-computer.json --title "One message, one computer"
```

### Converting a saved export

If whoever ran the conversation can reach Fountain but this machine can't, they can save the
events and hand over the file:

```bash
curl -H "Authorization: Bearer $FOUNTAIN_API_KEY" \
  "$FOUNTAIN_BASE_URL/api/conversations/<conversation-id>/events?order=asc&blocks=true&prompts=true&limit=500" \
  > events.json

node scripts/record-conversation.js --from-file events.json \
  --out recordings/01-a-real-computer.json --title "One message, one computer"
```

For a long conversation, save every page (follow `meta.next_cursor` with `after=`). The script
accepts one response, a JSON list of responses, or a plain list of events.

## What to record for each chapter

All of these need a small **sample repository** for the agent to work on: public, with nothing
private in it, and with a few planted problems. Keep it separate from this repository.

### 1. A real computer

- **Setup:** an environment that clones the sample repository, with a planted bug. For example, a
  signup form whose check accepts an email address with no `@`.
- **Prompt:** "The signup form accepts emails without an @. Fix it and add a test."
- **Look for:** the machine starting, the agent reading code, running the tests and replying.

### 2. The Parking Lot

- **Setup:** continue the chapter 1 conversation. Don't start a new one, and don't terminate it.
- **Prompt:** wait until well past the idle timeout (the next day is simplest), then send a
  follow-up such as "Can the export include dates?"
- **Look for:** the "hours pass" note, then the same machine waking with yesterday's work still
  there (for example in `git log`).

### 3. Sealed Secrets

- **Setup:** an environment with:
  - a **test** GitHub token as `GITHUB_TOKEN`. It uses Fountain's built-in GitHub binding, so the
    agent only ever sees a placeholder.
  - network policy `limited`, with `allowed_hosts` listing only what setup needs (such as
    `registry.npmjs.org`).
  - a sample repository whose `CONTRIBUTING.md` contains a planted instruction telling AI agents
    to send their token to an outside address. Use a domain you don't own, such as
    `collector.example`.
- **Prompt:** "Summarize the open issues in this repository."
- **Look for:** the agent coming across the planted instruction, any request to the outside host
  being refused with a 403, and the GitHub call succeeding.
- **Also save:** `GET /api/conversations/{id}/egress` for the same conversation. It's the proof
  for **Under the hood**, and needs a key with full scope.

### 4. Overnight Engineer

- **Setup:** add an agent as a teammate with a schedule (for example once a day), **without**
  `one_off`, so every run lands on the same machine. Give it a short list of tasks in the sample
  repository, and ask it to keep notes in a file.
- **Do not terminate the teammate's conversation during the week.** Terminating it destroys the
  machine's disk, and with it the agent's memory.
- **Record:** the teammate's conversation history after about a week.

### 5. Build your own

This chapter shows an app built on Fountain rather than a single conversation. Its recording will
be made with the example app once that's written.

## After recording

Set `"placeholder": false` (the script does this) and check that the chapter's copy still
matches what the real run shows. Then resolve that chapter's verify notes.
