# Overnight Engineer

## Story

Because a parked computer keeps everything on its disk, an agent can work on
something for days, not just minutes.

We gave one agent a small project and a standing assignment: check in on a
schedule, pick up the next task, do the work, and go back to sleep. Each time
it woke up, everything from the last session was still there: the code it had
written, the notes it had left itself, the tools it had installed.

The demo compresses that week into a time-lapse.

## Takeaway

Agents that remember work like a colleague, not a search box.

## Under the hood

- The agent is a **teammate**: an agent with one conversation that continues.
  A **schedule** is a cron (in UTC) that sends that teammate a prompt, as if
  someone had typed it.
- Each run lands in the same conversation, on the same sandbox, so its disk
  holds everything from earlier runs. Between runs the sandbox is suspended.
- Schedules are managed through the Schedules API, the SDK
  (`fountain.team.schedules`), the CLI's manifests, or the Team app.
- Every turn's events stay in the conversation's history, which is what the
  time-lapse is built from.

[[verify: The memory lives on the sandbox's disk. Terminating the
conversation destroys it, so nobody should terminate the demo teammate during
the recording week.]]

[[verify: This recording needs about a week of real runs. Start it on day 1.]]
