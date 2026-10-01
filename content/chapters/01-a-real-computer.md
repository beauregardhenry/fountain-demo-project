# A real computer

## Story

Most AI products answer from memory: you ask, it replies with text.

A Fountain agent does more. When you send it a message, it gets **its own
computer**. That computer already has the project's code on it, the tools it
needs installed, and permission to use the services it works with. The agent
reads files, runs commands, makes changes and checks its own work, the way a
person at a keyboard would.

And you can **watch it happen**. Every step streams back as it happens, so the
work is visible rather than hidden behind a spinner.

The demo shows one message going in and an agent getting to
work.

## Takeaway

This isn't a chatbot answering from memory. It's an agent with a computer.

## Under the hood

- One HTTP request starts a **conversation**. Fountain wakes a sandboxed
  machine built from an **environment** template (repositories, packages,
  secrets) and runs the chosen **agent** on it.
- Supported agents: Claude Code, Codex, Gemini CLI and opencode, all behind
  the same API.
- Output streams back as Server-Sent Events. Each event carries `kind`,
  `stream`, `data`, `stage`, `state`, `turn_id` and `ts`, so a client can
  group events by turn and show progress live.
- The same thing is available from the web dashboard, the `fountain` CLI, and
  SDKs for TypeScript, Python, Elixir and Swift. In the README's words,
  "everything they do, you can do with `curl`."

[[verify: Replace the placeholder recording with a real run, and confirm the
event fields above still match the pinned Fountain version.]]
