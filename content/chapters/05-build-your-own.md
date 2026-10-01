# Build your own

## Story

Everything you've seen so far was built the way any company could build it.

Fountain is a **platform**. A developer writes an ordinary web app that hires
an agent, sends it instructions, and shows what it does. They don't need to run
servers for the agents, manage their computers, or handle their keys.
Fountain does that part.

The demo shows a complete working app built on Fountain, short
enough to fit on one screen.

There's a whole suite of these already, from a research assistant to an uptime
monitor to a group chat where the agents are teammates. Each one is an ordinary
app sitting on top of Fountain.

## Takeaway

Fountain is the layer other companies build agent products on.

## Under the hood

- Official SDKs: TypeScript, Python, Elixir and Swift, plus a CLI. All of them
  wrap the same REST API, documented with OpenAPI.
- Fountain also publishes `/llms.txt` and a `/skill` endpoint, so other coding
  agents can discover and use the API by themselves.
- The demo suite holds that "an app which hires agents, prompts them and
  renders what they do is an ordinary web app with no privileged access."
- Fountain can also be **self-hosted** with the same apps, API, CLI and SDKs.
  The server is open source under AGPL-3.0; SDKs and CLI are Apache-2.0.

[[verify: "Short enough to fit on one screen" assumes the example app comes in
around 40 lines. Adjust once the real example is written.]]
