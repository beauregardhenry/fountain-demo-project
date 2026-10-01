# Open questions for engineering

These came from reading the public repos, not the running product, so some may
already have easy answers.

| # | Question | Blocks |
|---|----------|--------|
| Q1 | Does the API expose cost or credit usage per conversation (or per turn)? If not, what's the most honest way to show "the meter stops when parked"? | Ch. 2 |
| Q2 | Can broker rules (which host gets which credential) be configured through the public API, or only by an operator? | Ch. 3 |
| Q3 | Which Fountain version should the tour pin to, given ADR 0058 is still landing? | All |
| Q4 | Is the routines/scheduling feature (used by the Team demo) available through the public API for chapter 4? | Ch. 4 |
| Q5 | Which hosted account and credits should the live mode use, and who owns that budget? | All |
| Q6 | Is there an existing way to record an SSE stream and replay it, or should replay mode be built from scratch? | Replay mode |
| Q7 | Should this eventually live in `managoat/demos` alongside the other apps? | Hosting |
