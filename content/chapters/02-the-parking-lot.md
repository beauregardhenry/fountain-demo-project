# The Parking Lot

## Story

A computer for every conversation sounds expensive. But most of a conversation
is waiting: for a person to read the answer, think, and reply. Sometimes for
days.

So when nobody has sent a conversation a message for a while, Fountain
**parks** its computer. Parking keeps everything on the disk (the code, the
changes, the installed tools) but switches the machine off. A parked machine
costs almost nothing, and it doesn't use up the account's work credits.

When the next message arrives, the computer wakes up exactly as it was left.
The agent picks up where it stopped instead of starting over.

## Takeaway

A conversation can wait for days without its computer running.

## Under the hood

- A conversation is `running` while a turn is in flight and `idle` between
  turns. After `SANDBOX_IDLE_TIMEOUT_MINUTES` with no activity (60 by
  default), Fountain **suspends** the sandbox. It scales to zero, and the
  disk survives.
- The next prompt wakes the **same** sandbox, so the agent's memory and files
  carry over. Fountain never ages a suspended sandbox out.
- Hosted work spends a credit balance. In the API docs' words, "an idle
  machine does not burn turn credits."
- Fountain measures active sandbox time per provider, and parked time doesn't
  count. `GET /api/sandboxes?status=suspended` lists the parked machines,
  which is what a live version of this board would draw from.

[[verify: An idle sandbox keeps running, and costing provider time, until the
idle timeout parks it. The 60-minute default is the self-hosted setting; ask
which value the hosted platform uses before quoting a number.]]

[[verify: The docs report sandbox minutes per account and per provider, not
a cost per conversation. Show working/parked states rather than dollar
figures unless engineering confirms a per-conversation number.]]
