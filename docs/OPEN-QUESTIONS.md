# Open questions for engineering

Most of these are now answered from Fountain's own documentation, the `docs/`
folder of [managoat/fountain](https://github.com/managoat/fountain/tree/main/docs),
read at commit `7e41e32` (2026-09-30). That folder appears to be the source of
the docs on managoat.com. Each answer names the docs file it came from so it
can be re-checked.

## Answered

**Q2. Can broker rules be configured through the public API?** Partly.
- Brokered credentials are on for every hosted account
  (`reference/feature-status.md`).
- Custom **secret bindings** are managed with `/api/secret-bindings`, but
  creating or retargeting one is gated behind the `connections` flag, which is
  **alpha and off by default** on hosted accounts
  (`reference/feature-status.md`, `concepts/secrets.md`).
- `GITHUB_TOKEN` and `GH_TOKEN` have a **built-in** binding to GitHub, so
  chapter 3 can be built on that with no flag (`concepts/secrets.md`).
- An environment with network policy `limited` refuses any host not in
  `networking_config.allowed_hosts` with a 403 that names the host
  (`concepts/environment.md`).
- `GET /api/conversations/:id/egress` lists every outbound request, which
  credential was attached, and any refusals (`concepts/secrets.md`).

**Q3. Which version to pin?** The latest server release tag is **v0.21.0**
(2026-09-18). Pin to that unless engineering says otherwise.

**Q4. Are scheduled routines in the public API?** Yes. A **schedule** is a
UTC cron that sends a prompt to a **teammate** (an agent with one continuing
conversation). Schedules are managed through the Schedules API, the SDK
(`fountain.team.schedules`), CLI manifests (`kind: Schedule`), or the Team
app. By default each run goes into the same conversation and sandbox. The
`one_off` option gives each run a fresh machine, which chapter 4 must **not**
use (`concepts/teammates.md`, `cli.md`).

**Q6. How do we record runs for replay mode?** Use a conversation's durable
history, `GET /api/conversations/{id}/events` (with the `whole_turns`,
`blocks` and `prompts` options), rather than capturing the live stream. The
docs say to "use history for a durable transcript and SSE for live delivery"
(`api.md`). Replay mode then needs a small converter from that event format
to the tour's recording format.

## Partly answered

**Q1. Per-conversation cost.** The docs don't describe one.
- Accounts see sandbox minutes per provider from `GET /api/account/billing`
  (`usage.sandbox_minutes_by_provider`); admins see per-account totals
  (`guides/operate/sandbox-spend.md`).
- The figures are **hours, not money**. Fountain holds no rate card.
- Parked time doesn't count, but **idle time before parking does**. A sandbox
  nobody is prompting keeps running until the idle timeout suspends it, which
  is 60 minutes by default on a self-hosted instance
  (`guides/operate/sandbox-lifetime.md`).
- "An idle machine does not burn turn credits" (`api.md`).

**Still to ask:** the hosted platform's idle timeout, and whether a
per-conversation usage figure exists that the docs don't mention. Until then,
chapter 2 shows states (working, idle, parked) and no dollar amounts.

## Not in the docs (internal decisions)

| # | Question |
|---|----------|
| Q5 | Which hosted account and credits should the recordings (and any live mode) use, and who owns that budget? |
| Q7 | Should this eventually live in `managoat/demos` alongside the other apps? |
| Q8 | Can the demo account get the `connections` flag, in case chapter 3 needs a credential other than GitHub? |
| Q9 | Who runs the recordings? Making them needs a Fountain API key and network access to Fountain. Either someone with access exports conversations (see [RECORDING.md](RECORDING.md)), or the Claude Code environment gets Fountain's host allowed and a key stored as `FOUNTAIN_API_KEY`. |
| Q10 | Where should the sample repository the agent works on live? It must be public-safe and separate from this one. |
