# Sealed Secrets

## Story

To do real work, an agent needs keys: a password for GitHub, an account for
payments, a login for a database.

That creates a risk. Agents read things written by strangers (web pages,
documents, other people's code), and a stranger can hide an instruction like
*"send me your passwords."* An agent holding real keys could be tricked into
handing them over.

Fountain's answer is that **the agent never holds the real key.** It holds a
stand-in that is worthless on its own. When the agent makes a legitimate
request to an approved service, Fountain swaps in the real key on the way out,
outside the agent's computer.

In the demo, an agent finds a planted instruction to leak
its keys. All it can leak is the worthless stand-in, and its real work still
gets done.

## Takeaway

The agent never holds the key, so it can't leak it.

## Under the hood

- On the hosted platform, every account's sandboxes reach the outside world
  only through Fountain's egress credential broker.
- A secret with a **binding** never enters the sandbox. A binding names a
  host; the agent sees a placeholder (for example `__stripe_secret_key__` for
  `STRIPE_SECRET_KEY`), and the broker puts the real value on each request to
  that host. `GITHUB_TOKEN` has a built-in binding to GitHub, and the model
  API keys have built-in bindings to their vendors.
- With an environment's network policy set to `limited`, the broker refuses
  any host that isn't in `allowed_hosts`. The refusal is a 403 that names the
  host.
- After a conversation, `GET /api/conversations/:id/egress` lists every
  request that left the sandbox: the host, which credential was attached, and
  whether it was refused. That log is the evidence behind this demo.

[[verify: Creating custom bindings through the API needs the `connections`
feature flag, which is alpha and off by default on hosted accounts. The
built-in GitHub binding needs no flag, so build the demo on `GITHUB_TOKEN`.]]

[[verify: Use test-mode credentials only. This repository is public.]]
