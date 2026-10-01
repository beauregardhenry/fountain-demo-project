# fountain-demo-project (working title)

A guided tour of [Fountain](https://github.com/managoat/fountain) for potential
investors. It demonstrates the product and teaches what it is at the same time.

Fountain runs coding agents (Claude Code, Codex, Gemini CLI, opencode) behind
one HTTP API, with a real computer behind every conversation. This tour shows
that in about 5–7 minutes, in five chapters.

## How the tour teaches

Every chapter has two layers:

- **The story layer** (always visible): one plain-English idea, a
  demonstration of it, and a one-sentence takeaway. No jargon required.
- **Under the hood** (expandable): the API calls, the event stream and the
  architecture, for technical investors who want proof.

Every demonstration plays from a **recording** (replay mode), so a pitch never
depends on conference Wi-Fi, account credits or API changes.

## The chapters

| # | Chapter | The idea, in one sentence |
|---|---------|---------------------------|
| 1 | A real computer | This isn't a chatbot answering from memory. It's an agent with a computer. |
| 2 | The Parking Lot | A conversation can wait for days without its computer running. |
| 3 | Sealed Secrets | The agent never holds the key, so it can't leak it. |
| 4 | Overnight Engineer | Agents that remember work like a colleague, not a search box. |
| 5 | Build your own | Fountain is the layer other companies build agent products on. |

## Run it

It's plain HTML, CSS and JavaScript with nothing to install. It needs a local
web server because it loads the chapter files (opening `index.html` directly
won't work):

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The arrow keys move between chapters, and
Space plays the demo.

## Edit the words

All the copy lives in `content/chapters/`, one Markdown file per chapter. See
[docs/EDITING-COPY.md](docs/EDITING-COPY.md). You don't need to touch any code.

## Status

- Tour shell and first-draft copy: done.
- Recordings: **placeholders**. Each is labeled on screen as illustrative, not
  real Fountain output, until it's replaced with a recorded run.
- The tour shows a **Draft** badge and a yellow "To verify before presenting"
  box on each chapter until `"draft"` is set to `false` in
  `content/tour.json`.

See [docs/PLAN.md](docs/PLAN.md) for the build plan and
[docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) for what's been confirmed.
